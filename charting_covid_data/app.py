from chalice import Chalice, Rate
from chalicelib.update_case_data import update_case_data
from chalicelib.create_covid_json import generate_case_json
from chalicelib.create_new_case_json import generate_new_case_json
from chalicelib.push_to_s3 import upload_file, clear_cloudfront_cache
import boto3
from datetime import datetime

app = Chalice(app_name='charting_covid_data')

CLOUDFRONT_DISTRIBUTION_ID = "EMZKVG33KBTNS"
BUCKET = "charting-covid-prod"
s3_client = boto3.client("s3")


# @app.route('/')
# def index():
@app.schedule(Rate(4, unit=Rate.HOURS))
def index(event):
    county_input, state_input = update_case_data()
    case_json = generate_case_json(county_input, state_input, "/tmp/covid_data.json.gz", 5)
    print("Case JSON:     {}".format(case_json))
    new_case_json = generate_new_case_json(county_input, state_input, "/tmp/new_case_data.json.gz", 50)
    print("New Case JSON: {}".format(new_case_json))
    upload_file(case_json, destination="data", bucket="charting-covid-prod", separator="/tmp")
    upload_file(new_case_json, destination="data", bucket="charting-covid-prod", separator="/tmp")
    clear_cloudfront_cache()
    return "Hello World"


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
