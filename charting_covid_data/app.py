from chalice import Chalice, Rate
from chalicelib.update_case_data import update_case_data
from chalicelib.create_covid_json import generate_case_json
from chalicelib.create_new_case_json import generate_new_case_json
from chalicelib.push_to_s3 import upload_file, clear_cloudfront_cache
import boto3

app = Chalice(app_name='charting_covid_data')

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
