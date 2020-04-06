import argparse
import mimetypes
import os
from datetime import datetime

import boto3

# cache static assets for one year, rely on filename to break cache
STATIC_ASSET_CACHE_CONTROL = "no-cache, max-age={}".format(60 * 60 * 24 * 365)
CLOUDFRONT_DISTRIBUTION_ID = "EMZKVG33KBTNS"


def generate_object_name(destination, file_path, separator):
    """
    Generate the full path within an S3 bucket to save upload a file to.
    :param destination: The path within the s3 bucket to use as root
    :param file_path: The local path of the file
    :param separator: The seperator dividing the local portion of the file path
        to what we want on S3. Eg. "docs/static/css/style.css" would likely have
        a separator of "docs" so we could end up with an object name of
        "static/css/style.css"
    :return: A string representing the object name, which contains the full path
        to our object within our bucket. Eg. "static/css/style.css"
    """

    # Add a "/" to the end of our seperator if it does not already have one.
    # We do this b/c if our object name begins with a "/", s3 would put our
    # object in an unnamed directory at our project root
    separator = separator if separator.endswith("/") else separator + "/"

    return os.path.join(destination, file_path.split(separator)[1])


def upload_file(file_name, destination="", bucket="ramble-prod", separator="/"):
    """
    Upload a file to an s3 bucket.
    :param file_name: File to upload
    :param destination: The path in the bucket to upload file to
    :param bucket: Bucket to upload file to
    :param separator: Split the file name at this string, used to remove the
        local path from the file to upload.
    :return The object name or an empty string if we didn't upload
    """

    s3 = boto3.client("s3")

    print("upload_file - file_name:   {}".format(file_name))
    object_name = generate_object_name(destination, file_name, separator)
    print("upload_file - object_name: {}".format(object_name))

    extra_args = {
        "ACL": "public-read",
        "ContentType": mimetypes.guess_type(object_name)[0]
    }
    # HTML files won't have a file extension since frozen flask creates files
    # from an endpoint (eg. "/map-material-options"). We need to tell S3 the
    # proper content-type since it won't be able to infer it from the extension
    fn, ext = os.path.splitext(object_name)
    if not ext:
        extra_args["ContentType"] = "text/html"

    # Don't upload uncompressed JS
    if ext == ".js":
        return ""

    if ext in [".css", ".svg", ".jpg", ".jpeg", ".png"]:
        extra_args["CacheControl"] = STATIC_ASSET_CACHE_CONTROL

    # Tell s3 our js file is gzipped
    if ext == ".gz" and (fn.endswith(".js") or fn.endswith(".json")):
        extra_args["ContentEncoding"] = "gzip"
        extra_args["CacheControl"] = "no-cache, max-age=0"

        object_name = fn
    elif ext == ".gz":  # ignore gzipped source maps
        return ""

    # Use proper content-type for a JS source map
    if ext == ".map":
        extra_args["ContentType"] = "application/octet-stream"

    s3.upload_file(file_name,
                   bucket,
                   object_name,
                   ExtraArgs=extra_args)
    return object_name


def clear_cloudfront_cache():
    """
    Invalidates all files in our cloudfront cache
    """
    client = boto3.client("cloudfront")
    client.create_invalidation(
        DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
        InvalidationBatch={
            'Paths': {
                'Quantity': 1,
                'Items': ["/*"]
            },
            # CallerReference needs to be a unique value in order to perform
            # an invalidation
            'CallerReference': str(int(datetime.now().timestamp()))
        }
    )
    print("Cloudfront cache invalidated")


argparse_description = """Push a directory to s3, maintaining the directory structure within the source directory at the destination on s3.

If the provided directory has the following structure:
test/
  foo/
    README.md
  hello.txt

and the destination is: "static", the following objects will get uploaded to s3:
- static/test/foo/README.md
- static/test/hello.txt"""

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=argparse_description,
                                     formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--directory",
                        default="dist",
                        help="Path to directory to upload to S3")
    parser.add_argument("--destination",
                        default="",
                        help="Path to save files to in S3 bucket. Default is bucket root")
    parser.add_argument("--bucket",
                        default="charting-covid-prod",
                        help="Name of S3 bucket to update")
    args = parser.parse_args()

    confirm = False
    if args.bucket == "charting-covid-prod":
        confirm = input("Are you sure you want to deploy to production? (yes/no): ")

    if confirm == "yes" or args.bucket != "charting-covid-prod":
        for root, _, filenames in os.walk(args.directory):
            for filename in filenames:
                print(filename)
                file_path = os.path.join(root, filename)
                uploaded_file = upload_file(file_path,
                                            args.destination,
                                            bucket=args.bucket,
                                            separator=args.directory)
                if uploaded_file:
                    print("Uploaded: {}".format(uploaded_file))
                else:
                    print("Skipped:  {}".format(file_path))

        # if we deployed to producton, clear cloudfront cache and post to slack
        if args.bucket == "charting-covid-prod":
            clear_cloudfront_cache()
    else:
        print("Did not deploy")
