import json
from datetime import datetime
from gzip import GzipFile
from io import BytesIO

from chalice import Chalice, Rate
import boto3
import gzip

from chalicelib.update_case_data import update_case_data
from chalicelib.create_covid_json import generate_case_json
from chalicelib.create_new_case_json import generate_new_case_json
from chalicelib.push_to_s3 import upload_file, clear_cloudfront_cache
from chalicelib.fips_data import fips_data

app = Chalice(app_name='charting_covid_data')

CLOUDFRONT_DISTRIBUTION_ID = "EMZKVG33KBTNS"
BUCKET = "charting-covid-prod"

# This gets set when lambda is run as a chron. If False it means we're running
# locally
event = False


def write_dict_to_gzipped_json(data, output_filename):
    json_str = json.dumps(data)
    json_bytes = json_str.encode("utf-8")
    with gzip.GzipFile(output_filename, "w") as output:
        output.write(json_bytes)
    return output_filename


# @app.route('/')
# def index():
@app.schedule(Rate(4, unit=Rate.HOURS))
def case_data(event):
    start = datetime.now()
    # fetch new cases
    print("Getting case data")
    print("time delta: {}".format((datetime.now() - start).seconds))
    county_input, state_input = update_case_data()

    # update case file
    print("Updating cases")
    print("time delta: {}".format((datetime.now() - start).seconds))
    case_data = generate_case_json(county_input, state_input, fips_data, 5)
    # if event, we are on s3 running as a chron
    if event:
        print("GZIP")
        print("time delta: {}".format((datetime.now() - start).seconds))
        case_json = write_dict_to_gzipped_json(case_data, "/tmp/covid_data.json.gz")
        print("Attempting to upload")
        print("time delta: {}".format((datetime.now() - start).seconds))
        upload_file(case_json, destination="data", bucket="charting-covid-prod",
            separator="/tmp")
        print("Uploaded case data")
        print("time delta: {}".format((datetime.now() - start).seconds))
    else:
        with open("../data/covid_data.json", "w") as output:
            output.write(json.dumps(case_data))

    clear_cloudfront_cache()
    print("Cache cleared")
    print("time delta: {}".format((datetime.now() - start).seconds))
    return "Case Update Succeeded"


# @app.route('/')
# def index():
@app.schedule(Rate(4, unit=Rate.HOURS))
def new_case_data(event):
    # fetch new cases
    county_input, state_input = update_case_data()

    # update data
    new_case_data = generate_new_case_json(county_input, state_input, 50)
    # if event, we are on s3 running as a chron
    if event:
        new_case_json = write_dict_to_gzipped_json(new_case_data,
            "/tmp/new_case_data.json.gz")
        upload_file(new_case_json, destination="data", bucket="charting-covid-prod",
            separator="/tmp")
    else:
        with open("../data/new_case_data.json", "w") as output:
            output.write(json.dumps(new_case_data))

    return "New Case Update Succeeded"


@app.route("/dummy")
def dummy():
    """Hack used to get chalice to generate proper IAM b/c of bug related to
       boto3.resource not triggering correct IAM policy:
       https://github.com/aws/chalice/issues/118#issuecomment-298490541
    """
    ddb = boto3.client("s3")
    try:
        ddb.get_object(Bucket="matthewparrilla.com")
        ddb.put_object(Bucket="matthewparrilla.com")
        ddb.put_object_acl(Bucket="matthewparrilla.com", ACL="public-read")
    except Exception as e:
        print("move along")

    client = boto3.client("cloudfront")
    client.create_invalidation(
        DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
        InvalidationBatch={
            'Paths': {
                'Quantity': 1,
                'Items': ["/dontmatchever"]
            },
            # CallerReference needs to be a unique value in order to perform
            # an invalidation
            'CallerReference': str(int(datetime.now().timestamp()))
        }
    )
