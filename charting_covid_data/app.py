from chalice import Chalice
from chalicelib.update_case_data import update_case_data
from chalicelib.create_covid_json import generate_case_json
from chalicelib.create_new_case_json import generate_new_case_json
import boto3

app = Chalice(app_name='charting_covid_data')

BUCKET = "charting-covid-prod"
s3_client = boto3.client("s3")


@app.route('/')
def index():
    county_input, state_input = update_case_data()
    case_data = generate_case_json(county_input, state_input, "../data/covid_data.json", 5)
    new_case_data = (county_input, state_input, "../data/new_case_data.json", 50)
    return "Hello World"
