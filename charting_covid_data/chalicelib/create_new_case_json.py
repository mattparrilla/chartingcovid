from collections import defaultdict
from datetime import datetime
import json
import gzip

from chalicelib.create_covid_json import record_case_counts, get_daily_increases


def generate_new_case_data(input_data: list, minimum_case_count: int,
        is_state_file: bool=False) -> dict:
    """
    Outputs a dictionary from FIPS -> list of chronological daily case count
    increases.

    The increases are only recorded once this FIPS reached 50 cases.
    """
    # Offsets of the data within the csv.
    # Example: 2020-03-28,Snohomish,Washington,53061,912,23
    DATE = 0

    earliest_date = \
        datetime.strptime(input_data[1][DATE], '%Y-%m-%d').date()
    latest_date = datetime.strptime(
        input_data[-1][DATE], '%Y-%m-%d').date()
    # Create an empty list for each entry with length being the total days
    # we might have data for.
    # This will store case count in reverse chronological order.
    total_days_of_data = (latest_date - earliest_date).days + 1
    inverse_chronological_case_data = \
        defaultdict(lambda: [None] *total_days_of_data)

    # For the purposes of this script we don't care about the output
    # of the first return value, which is a dictionary of all case count
    # data. We only want the chronological list of cases for each place
    # that is output 2nd.
    _, inverse_chronological_case_data = record_case_counts(
            input_data, defaultdict(dict), False, inverse_chronological_case_data,
            False, is_state_file, latest_date)

    output_data = {}
    for fips, case_counts in inverse_chronological_case_data.items():
        post_minimum_case_counts = \
            [i for i in case_counts if type(i) == int and i >= 50]
        # get_daily_increases will return only the differences from 1 day
        # to the next, and will attempt to smooth out the data if the same
        # value is recorded 2 days in a row. When this happens it will
        # often be due to recording delay, not the reality of case counts.
        # NOTE: If there are 3 days in a row with the same count, it does
        # not attempt a smoothing.
        increases = get_daily_increases(post_minimum_case_counts)
        # The increases are currently reverse chronological, but we want
        # to record chronological for this data source.
        increases.reverse()

        if len(increases):
            # We'd like to remove daily counts at the front (latest) end
            # of our list if there has been no increase recorded. These
            # will often mean just no data was recorded and will make the
            # graph look odd.
            latest_increase = 0
            for i in range(len(increases)):
                if i > 0:
                    latest_increase = i
                    break
            output_data[fips] = increases[latest_increase:]

    return output_data


def generate_new_case_json(counties_data: list, states_data: list,
        minimum_case_count: int) -> dict:
    state_data = generate_new_case_data(
        states_data, minimum_case_count, is_state_file=True)
    county_data = generate_new_case_data(counties_data, minimum_case_count)
    state_data.update(county_data)
    return state_data
