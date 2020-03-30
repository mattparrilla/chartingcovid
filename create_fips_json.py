import argparse
import csv
import json


# Offsets in the input CSV file.
STATE_CODE = 3
COUNTY_CODE = 4
STATE_NAME = 5
COUNTY_NAME = 6
POPULATION = 18


def read_census_file(filename):
    """
    Outputs a JSON file containing US FIPS data in the format:
    {"FIPS_ID (ex: 34003)":
        {
            "county": "Bergen County",
            "state": "New Jersey",
            "population": 932202
        }
     "FIPS_ID (ex: 34)":
        {
            "county": "",
            "state": "New Jersey",
            "population": 8882190
        }
     ...
    """
    with open(filename, encoding="ISO-8859-1") as csv_file:
        reader = csv.reader(csv_file, delimiter=',')
        output_data = {}

        # Skip the first line (the table header).
        next(reader)

        for row in reader:
            state_code = int(row[STATE_CODE])
            county_code = int(row[COUNTY_CODE])
            is_state = county_code == 0

            if is_state:
                fips_code = "{0:0=2d}".format(state_code)
            else:
                fips_code = "{0:0=2d}{1:0=3d}".format(state_code, county_code)

            state_name = row[STATE_NAME]
            county_name = row[COUNTY_NAME]
            # If this row is for a state, then the county code will be 0.
            # We don't want to record a county name in this case.
            if is_state:
                county_name = ""

            population = int(row[POPULATION])

            output_data[fips_code] = {
                "county": county_name,
                "state": state_name,
                "population": population
            }
        return output_data


def generate_json(input_file, output_file):
    state_and_county_data = read_census_file(input_file)

    with open(output_file, "w") as output:
        json.dump(state_and_county_data, output)


parser = argparse.ArgumentParser()
parser.add_argument("--input_file", help="File path to current county CSV.",
    default="raw_county_census_data.csv")
parser.add_argument("--output_file", help="File path to output JSON file.",
    default="fips_data.json")
args = parser.parse_args()

generate_json(args.input_file, args.output_file)
