import requests
import csv
from io import StringIO


def convert_to_list(scsv):
    f = StringIO(scsv)
    reader = csv.reader(f, delimiter=',')
    return list(reader)


def update_case_data():
    county_request = requests.get('https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv')
    state_request = requests.get('https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv')
    return [convert_to_list(county_request.text), convert_to_list(state_request.text)]
