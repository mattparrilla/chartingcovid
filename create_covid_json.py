import argparse
from collections import defaultdict
import csv
from datetime import datetime
import json
from statistics import mean


def read_fip_data(filename):
    pass


def read_covid_file(
        filename, date_data, moving_average_days, is_state_file=False):
    # Offsets of the data within the file
    date = 0
    fips = 3
    cases = 4
    if is_state_file:
        fips = 2
        cases = 3

    with open(filename) as csv_file:
        reader = csv.reader(csv_file, delimiter=',')
        csv_list = list(reader)
        earliest_date = \
            datetime.strptime(csv_list[1][date], '%Y-%m-%d').date()
        latest_date = datetime.strptime(
            csv_list[-1][date], '%Y-%m-%d').date()
        # Each entry is an empty list with length of total days we can
        # possibly have data for.
        # This will store case count for each day chronologically moving
        # backwards from the latest date in the dataset.
        total_days_of_data = (latest_date - earliest_date).days + 1
        fips_list_data = defaultdict(lambda: [None]*total_days_of_data)

        # Skip the initial header line.
        for row in csv_list[1:]:
            # date_data is keyed by date, and then FIPS.
            # {"2020-03-27":
            #    {"56043": {"cases": 12}, ...}
            # }
            date_data[row[date]][row[fips]] = {"cases": int(row[cases] or 0)}

            # Store the number of cases in the fips list at the position which
            # represents the number of days since the latest (current) date.
            this_date = datetime.strptime(row[0], '%Y-%m-%d').date()
            day_offset = (latest_date - this_date).days
            fips_row = fips_list_data[row[fips]]
            fips_row[day_offset] = int(row[cases] or 0)

    # Add the daily moving average data.
    # This is the percent daily moving average in new cases over the prior
    # moving_average_days days.
    for date_string, fips_entries in date_data.items():
        for fips_id, cases_data in fips_entries.items():
            # Find the slice of fips_list_data cooresponding to the preceding
            # moving_average_days days for this fips location.
            this_date = datetime.strptime(date_string, '%Y-%m-%d').date()
            start = (latest_date - this_date).days
            end = min(start+moving_average_days, total_days_of_data)
            preceding_case_counts = fips_list_data[fips_id][start:end]
            if len(preceding_case_counts) != moving_average_days or \
                    None in preceding_case_counts:
                # We don't have enough days of data, or have faulty data.
                continue

            # Find the percentage increase in cases between each of the
            # preceding moving_average_days days and calculate the average.
            increase_percents = []
            for i in range(len(preceding_case_counts) - 1):
                increase_percents.append((preceding_case_counts[i] -
                    preceding_case_counts[i + 1]) /
                        preceding_case_counts[i + 1])
            date_data[date_string][fips_id]['moving_avg'] = mean(
                increase_percents)

    return date_data


def generate_json(
        counties_file, states_file, output_file, moving_average_days):
    empty_data = defaultdict(dict)
    state_data = read_covid_file(
        states_file, empty_data, moving_average_days, is_state_file=True)
    all_date_data = read_covid_file(
        counties_file, state_data, moving_average_days)

    with open(output_file, "w") as output:
        json.dump(all_date_data, output)


parser = argparse.ArgumentParser()
parser.add_argument("--county_input", help="File path to current county CSV.",
    default="us-counties.csv")
parser.add_argument("--state_input", help="File path to current state CSV.",
    default="us-states.csv")
parser.add_argument("--output_file", help="File path to output JSON file.",
    default="covid_data.json")
parser.add_argument("--moving_average_days",
    help="The number of preceding days' case number changes to average.",
    default=5, type=int)
args = parser.parse_args()

generate_json(args.county_input, args.state_input, args.output_file,
    args.moving_average_days)
