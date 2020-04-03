import argparse
from collections import defaultdict
import csv
from datetime import datetime
import json

from create_covid_json import record_case_counts, get_daily_increases


def generate_new_case_data(filename: str, minimum_case_count: int,
        is_state_file: bool=False) -> dict:
    """
    Outputs a dictionary from FIPS -> list of chronological daily case count
    increases.

    The increases are only recorded once this FIPS reached 50 cases.
    """
    # Offsets of the data within the csv.
    # Example: 2020-03-28,Snohomish,Washington,53061,912,23
    DATE = 0

    with open(filename) as csv_file:
        reader = csv.reader(csv_file, delimiter=',')
        csv_list = list(reader)
        earliest_date = \
            datetime.strptime(csv_list[1][DATE], '%Y-%m-%d').date()
        latest_date = datetime.strptime(
            csv_list[-1][DATE], '%Y-%m-%d').date()
        # Create an empty list for each entry with length being the total days
        # we might have data for.
        # This will store case count in reverse chronological order.
        total_days_of_data = (latest_date - earliest_date).days + 1
        inverse_chronological_case_data = \
            defaultdict(lambda: [None]*total_days_of_data)

        # For the purposes of this script we don't care about the output
        # of the first return value, which is a dictionary of call case count
        # data. We only want the chronological list of cases for each place.
        _, inverse_chronological_case_data = record_case_counts(
                csv_list, defaultdict(dict), inverse_chronological_case_data,
                False, is_state_file, latest_date)

        output_data = {}
        for fips, case_counts in inverse_chronological_case_data.items():
            post_minimum_case_counts = \
                [i for i in case_counts if type(i) == int and i >= 50]
            # get_daily_increases will return only the differences from 1 day
            # to the next, and will attempt to smooth out the data if the same
            # value is recorded 2 days in a row. When this happens it will
            # often be due to recording delay, not the reality of case counts.
            increases = get_daily_increases(post_minimum_case_counts)
            # The increases are currently reverse chronological, but we want
            # to record chronological for this data source.
            increases.reverse()
            output_data[fips] = increases

    return output_data



def generate_json(counties_file: str, states_file: str, output_file: str,
        minimum_case_count: int) -> None:
    state_data = generate_new_case_data(
        states_file, minimum_case_count, is_state_file=True)
    county_data = generate_new_case_data(counties_file, minimum_case_count)
    state_data.update(county_data)

    with open(output_file, "w") as output:
        json.dump(state_data, output)


parser = argparse.ArgumentParser()
parser.add_argument("--county_input", help="File path to current county CSV.",
    default="us-counties.csv")
parser.add_argument("--state_input", help="File path to current state CSV.",
    default="us-states.csv")
parser.add_argument("--output_file", help="File path to output JSON file.",
    default="new_case_data.json")
parser.add_argument("--minimum_case_count",
    help="The minimum number of cases a given FIPS must have to start "
         "outputting data.",
    default=50, type=int)
args = parser.parse_args()

if __name__ == "__main__":
    generate_json(args.county_input, args.state_input, args.output_file,
        args.minimum_case_count)
