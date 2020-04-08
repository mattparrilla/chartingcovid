import json
from datetime import datetime
from gzip import GzipFile
from io import BytesIO

from chalice import Chalice, Rate
import boto3

from chalicelib.update_case_data import update_case_data
from chalicelib.create_covid_json import generate_case_json
from chalicelib.create_new_case_json import generate_new_case_json
from chalicelib.push_to_s3 import upload_file, clear_cloudfront_cache

app = Chalice(app_name='charting_covid_data')

CLOUDFRONT_DISTRIBUTION_ID = "EMZKVG33KBTNS"
BUCKET = "charting-covid-prod"


# @app.route('/')
# def index():
@app.schedule(Rate(4, unit=Rate.HOURS))
def index(event):
    # read population data from our s3 bucket
    s3 = boto3.client("s3")
    compressed_object = s3.get_object(Bucket=BUCKET, Key="data/fips_data.json")
    bytestream = BytesIO(compressed_object['Body'].read())
    fips_data = json.loads(GzipFile(None,
        'rb', fileobj=bytestream).read().decode('utf-8'))

    # fetch new cases
    county_input, state_input = update_case_data()

    # update case file
    case_json = generate_case_json(county_input, state_input,
        "/tmp/covid_data.json.gz", fips_data, 5)
    upload_file(case_json, destination="data", bucket="charting-covid-prod",
        separator="/tmp")
    print("Case JSON:     {}".format(case_json))

    # update new cases file
    new_case_json = generate_new_case_json(county_input, state_input,
        "/tmp/new_case_data.json.gz", 50)
    upload_file(new_case_json, destination="data", bucket="charting-covid-prod",
        separator="/tmp")
    print("New Case JSON: {}".format(new_case_json))

    clear_cloudfront_cache()
    return "Update succeeded"


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
