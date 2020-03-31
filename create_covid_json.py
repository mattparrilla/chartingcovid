"""
Script to generate JSON data from NYTs state and county covid case data.

Args:

    --county_input: The file path to NYT county covid case data csv.
    --state_input: The file path to NYT state covid case data csv.
    --output_file: The path to file to output JSON to.
    --moving_average_days: The number of preceding days of case data to average
      when calculating the moving average of daily case growth.
    --output_fips_first: If true, the output JSON top level key will be a FIPS
      geographic entity code for the state/county. Otherwise, will be the date.
"""
import argparse
from collections import defaultdict
import csv
from datetime import datetime
import json
from statistics import mean


def read_covid_file(filename, output_data, moving_average_days,
        output_fips_first, is_state_file=False):
    """
    For a supplied csv file, containing either state or county covid data,
    this function will output a date-keyed dict in the format:
      {"YYYY-MM-DD":
         {"FIPS_ID": {"cases": X, "moving_average": X.X}, ...}
       ...
      }

      Example:
      {"2020-03-27":
         {"56043": {"cases": 12, "moving_average": 0.19}, ...}
       ...
      }

    Alternatively, when output_fips_first=True, the format will be:
      {"FIPS_ID":
         {"YYYY-MM-DD": {"cases": X, "moving_average": X.X}, ...}
       ...
      }

      Example:
      {"56043":
         {"2020-03-27": {"cases": 12, "moving_average": 0.19}, ...}
       ...
      }
    """
    # Offsets of the data within the file.
    # Example: 2020-03-28,Snohomish,Washington,53061,912,23
    DATE = 0
    FIPS = 2 if is_state_file else 3
    CASES = 3 if is_state_file else 4

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

        # Skip the initial header line.
        for row in csv_list[1:]:
            if output_fips_first:
                # output_data is keyed by FIPS, then date
                # {"56043":
                #    {"2020-03-27": {"cases": 12}, ...}
                # }
                output_data[row[FIPS]][row[DATE]] = \
                    {"cases": int(row[CASES] or 0)}
            else:
                # output_data is keyed by date, and then FIPS.
                # {"2020-03-27":
                #    {"56043": {"cases": 12}, ...}
                # }
                output_data[row[DATE]][row[FIPS]] = \
                    {"cases": int(row[CASES] or 0)}

            # Store the number of cases in the fips list at the position which
            # represents the number of days since the latest (current) date.
            this_date = datetime.strptime(row[0], '%Y-%m-%d').date()
            day_offset = (latest_date - this_date).days
            fips_row = inverse_chronological_case_data[row[FIPS]]
            fips_row[day_offset] = int(row[CASES] or 0)

    # Add the daily moving average data.
    # This is the percent daily moving average in new cases over the prior
    # moving_average_days days.
    for outer_key, entries in output_data.items():
        for inner_key, cases_data in entries.items():
            if output_fips_first:
                fips_id = outer_key
                date_string = inner_key
            else:
                fips_id = inner_key
                date_string = outer_key

            # Find the slice of inverse_chronological_case_data cooresponding
            # to the preceding moving_average_days days for this fips location.
            this_date = datetime.strptime(date_string, '%Y-%m-%d').date()
            start = (latest_date - this_date).days
            end = min(start+moving_average_days, total_days_of_data)
            preceding_case_counts = \
                inverse_chronological_case_data[fips_id][start:end]
            if len(preceding_case_counts) != moving_average_days or \
                    None in preceding_case_counts:
                # We don't have enough days of data, or have faulty data.
                continue

            # Find the absolute count of new daily cases for the previous
            # moving_average_days days.
            increases = []
            for i in range(len(preceding_case_counts) - 1):
                increases.append(preceding_case_counts[i] -
                    preceding_case_counts[i + 1])

            # Find the growth in daily new cases for the previous
            # moving_average_days days.
            # If any days have 0 increase, we skip, and assign a growth_factor
            # of 0. This indicates the county is not growing or experiencing
            # negative growth right now. Imperfect, but...
            growth_in_daily_new_cases = []
            if all(increases):
                for i in range(len(increases) - 1):
                    growth_in_daily_new_cases.append(
                        increases[i] / increases[i + 1])
            else:
                # Add a 0 just to avoid an error below. The growth_factor will
                # be 0.
                growth_in_daily_new_cases = [0]

            if output_fips_first:
                output_data[fips_id][date_string]['growth_factor'] = mean(
                    growth_in_daily_new_cases)
            else:
                output_data[date_string][fips_id]['growth_factor'] = mean(
                    growth_in_daily_new_cases)

    return output_data


def generate_json(counties_file, states_file, output_file, moving_average_days,
        output_fips_first):
    empty_data = defaultdict(dict)
    state_data = read_covid_file(
        states_file, empty_data, moving_average_days, output_fips_first,
        is_state_file=True)
    state_and_county_data = read_covid_file(
        counties_file, state_data, moving_average_days, output_fips_first)

    with open(output_file, "w") as output:
        json.dump(state_and_county_data, output)


parser = argparse.ArgumentParser()
parser.add_argument("--county_input", help="File path to current county CSV.",
    default="us-counties.csv")
parser.add_argument("--state_input", help="File path to current state CSV.",
    default="us-states.csv")
parser.add_argument("--output_file", help="File path to output JSON file.",
    default="covid_data.json")
parser.add_argument("--moving_average_days",
    help="The number of preceding days' growth changes to average.",
    default=5, type=int)
parser.add_argument("--output_fips_first",
    help="Output JSON will be top-level keyed by FIPS if this arg is passed. "
         "If this arg is not passed, the top-level key of the output will be "
         "the date.",
    action="store_true")
args = parser.parse_args()

generate_json(args.county_input, args.state_input, args.output_file,
    args.moving_average_days, args.output_fips_first)
