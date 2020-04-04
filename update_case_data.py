import requests


def update_case_data():
    county_request = requests.get('https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv')
    with open("us-counties.csv", "w") as county_output:
        county_output.write(county_request.text)

    state_request = requests.get('https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv')
    with open("us-states.csv", "w") as state_output:
        state_output.write(state_request.text)


update_case_data()
