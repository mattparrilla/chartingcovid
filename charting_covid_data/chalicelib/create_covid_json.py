from collections import defaultdict
from datetime import datetime, timedelta
import json
import math
import gzip
from statistics import mean
from typing import Optional, Union


# The minimum number of cases needed for a given date-FIPS pair to produce a
# growth factor and doubling time estimate.
MIN_CASE_COUNT = 50

Num = Union[int, float]


def set_case_count(output_data: dict, date: str, fips: str, cases: int,
        output_fips_first: bool) -> None:
    """
    Sets the given number of cases into output_data for a Date-FIPS combo.
    Does this based on the output_fips_first option.
    """
    if output_fips_first:
        # output_data is keyed by FIPS, then date
        # {"56043":
        #    {"2020-03-27": {"cases": 12}, ...}
        # }
        output_data[fips][date] = {"cases": cases}
    else:
        # output_data is keyed by date, and then FIPS.
        # {"2020-03-27":
        #    {"56043": {"cases": 12}, ...}
        # }
        output_data[date][fips] = {"cases": cases}


def get_case_count(output_data: dict, date: str, fips: str,
        output_fips_first: bool) -> Optional[int]:
    """
    Returns the number of cases recorded in output_data for a given
    Date-FIPS combination. If no entry, returns None.
    """
    if output_fips_first:
        entry = output_data[fips].get(date, None)
        if entry:
            return entry["cases"]
    else:
        entry = output_data[date].get(fips, None)
        if entry:
            return entry["cases"]
    return None


def get_exp_growth_rate(final: Num, starting: Num, num_periods: Num) -> float:
    """
    The exp function is Final = (Starting)e**(Rate*Periods)
    So, Rate = -ln(Starting/Final)/Periods
    For step-by-step:
    https://www.mathway.com/popular-problems/Algebra/201906
    """
    return -math.log(starting / final) / num_periods


def get_doubling_time(exp_growth_rate: float) -> float:
    """
    This is the amount of time that it will take for the provided exponential
    growth rate to case a count to double.

    The formula to calculate doubling time is:
        ln(2) / ln(1 + Rate)
    """
    return math.log(2) / math.log(1 + exp_growth_rate)


def get_averaged_doubling_time(preceding_case_counts: list) -> float:
    """
    The idea here is to return the average estimated doubling time of each of
    the preceding counts and the current count.

    We calculate the exponential growth rate between each of the preceding
    counts and the current count, and then return the average doubling time
    estimated by those growth rates.
    """
    growth_rates = []
    latest_count = preceding_case_counts[0]
    for i in range(1, len(preceding_case_counts)):
        earlier_count = preceding_case_counts[i]
        exp_growth_rate = get_exp_growth_rate(
            latest_count, earlier_count, num_periods=i)
        if exp_growth_rate > 0:
            growth_rates.append(exp_growth_rate)
    return mean([get_doubling_time(r) for r in growth_rates])


def get_daily_increases(preceding_case_counts: list) -> list:
    """
    # Find the absolute count of new daily cases for the previous
    # len(preceding_case_counts).
    #
    # If a day has the same count as the previous, we try to estimate a "most
    # likely" value for that date, given its surrounding case counts. The
    # details are explained below.
    """
    increases = []
    for i in range(len(preceding_case_counts) - 1):
        increase = \
            preceding_case_counts[i] - preceding_case_counts[i + 1]
        # Cases that have 0 increase introduce a division by 0 error
        # when we calculate our moving average. Many of these cases
        # will be days where there was a lack of reporting. We attempt
        # to extrapolate a "most likely" value for these no-change
        # days. We do this by calculating the exponential growth rate
        # between the previous and following day case counts and using
        # that rate to estimate a new value for the day.
        if i != 0 and increase == 0:
            next_count = preceding_case_counts[i - 1]
            previous_count = preceding_case_counts[i + 1]
            if next_count - previous_count == 0:
                # If there are 3 case counts in a row that are equal, we
                # decline to upwardly estimate case counts.
                break
            exp_growth_rate = get_exp_growth_rate(
                next_count, previous_count, num_periods=2)
            # To get the new count, we grow the previous day's count
            # by the exp growth rate we found above.
            # New Total = e**Rate * Starting
            new_count = \
                math.e**exp_growth_rate * previous_count
            increase = new_count - previous_count
        increases.append(increase)
    return increases


def get_growth_factor(preceding_case_counts: list) -> Optional[float]:
    """
    Calculate the moving average growth factor.
    This is the average relative daily growth in new cases over the prior
    len(preceding_case_counts) days.

    Example:

    Let's say preceding_case_counts is [150, 120, 100, 90, 80].
    80  -> 90  = 10 new cases
    90  -> 100 = 10 new cases
    100 -> 120 = 20 new cases
    120 -> 150 = 30 new cases
    The growth factor is the ratio of current to previous new cases, so we have
    growth factors of 1.5 (30/20), 2 (20/10), 1 (10/10)
    We average the daily growth rates and record a 1.5 growth factor
    """
    increases = get_daily_increases(preceding_case_counts)

    # Find the growth in daily new cases for the previous growth_metric_days
    # days, if possible.
    if all(increases):
        growth_in_daily_new_cases = []
        for i in range(len(increases) - 1):
            growth_in_daily_new_cases.append(
                increases[i] / increases[i + 1])
        return mean(growth_in_daily_new_cases)
    return None


def record_growth_metrics(output_data: dict,
        inverse_chronological_case_data: dict,
        output_fips_first: bool, growth_metric_days: int,
        latest_date: datetime.date, total_days_of_data: int) -> dict:
    """
    Add growth_factor and doubling_time to output_data.

    Growth factor is the average relative daily growth in new cases over the
    prior growth_metric_days days.

    Doubling time is the predicted time it will take for a given FIPS location
    and date combination to double its case count.

    Both of these metrics are explained further in get_growth_factor() and
    get_doubling_time().
    """
    for outer_key, entries in output_data.items():
        for inner_key, cases_data in entries.items():
            if output_fips_first:
                fips_id = outer_key
                date_string = inner_key
            else:
                fips_id = inner_key
                date_string = outer_key

            # Find the slice of inverse_chronological_case_data cooresponding
            # to the preceding growth_metric_days days for this fips location.
            this_date = datetime.strptime(date_string, '%Y-%m-%d').date()
            start = (latest_date - this_date).days
            end = min(start+growth_metric_days, total_days_of_data)
            preceding_case_counts = \
                inverse_chronological_case_data[fips_id][start:end]
            if len(preceding_case_counts) != growth_metric_days or \
                    None in preceding_case_counts or \
                    preceding_case_counts[0] < MIN_CASE_COUNT:
                # We don't have enough days of data, or have faulty data, or
                # have less than the minimum number of cases to calculate
                # a growth factor.
                continue

            growth_factor = get_growth_factor(preceding_case_counts)
            if growth_factor:
                if output_fips_first:
                    output_data[fips_id][date_string]['growth_factor'] = \
                        growth_factor
                else:
                    output_data[date_string][fips_id]['growth_factor'] = \
                        growth_factor

            doubling_time = get_averaged_doubling_time(preceding_case_counts)
            if doubling_time:
                if output_fips_first:
                    output_data[fips_id][date_string]['doubling_time'] = \
                        doubling_time
                else:
                    output_data[date_string][fips_id]['doubling_time'] = \
                        doubling_time
    return output_data


def record_case_counts(csv_data: list, output_data: dict,
        inverse_chronological_case_data: dict, output_fips_first: bool,
        is_state_file: bool, latest_date: datetime.date) -> (dict, dict):
    """
    Returns a tuple of case count data and inverse chronological case data.

    The case count data records the number of cases for each date-FIPS pair
    in the input csv file into a dictionary.

    If output_fips_first is False, the case count data will look like:
        {"2020-03-27":
            {"56043": {"cases": 12}, ...}
        ...
        }
    Otherwise:
        {"56043":
            {"2020-03-27": {"cases": 12}, ...}
        ...
        }

    The inverse_chronological_case_data is a dictionary of the format:
        Key: FIPS
        Value: List of inverse chronological case counts for that FIPS

    Example:
        {"56043": [45, 40, 34, 25, 23, ...], ...}
    """
    # Offsets of the data within the csv.
    # Example: 2020-03-28,Snohomish,Washington,53061,912,23
    DATE = 0
    COUNTY = 1
    FIPS = 2 if is_state_file else 3
    CASES = 3 if is_state_file else 4

    # Skip the initial header line.
    for row in csv_data[1:]:
        # TODO(bhold): Handle KC
        if not row[FIPS]:
            if not is_state_file and row[COUNTY] == "New York City":
                row[FIPS] = "-10003"
            else:
                continue

        cases = int(row[CASES] or 0)
        set_case_count(output_data, row[DATE], row[FIPS], cases,
            output_fips_first)

        this_date = datetime.strptime(row[DATE], '%Y-%m-%d').date()
        # Indicates how many previous days' case counts were adjusted
        # down below, due to the current day's count being lower. In this
        # case older counts were in error. Either the case(s) was
        # incorrect or reassigned to another FIPS. This count indicates
        # how many previous days' counts we need to adjust down in the
        # inverse_chronological_case_data as well.
        previous_days_adjusted_down = 0
        previous_day = this_date - timedelta(days=1)
        previous_day_string = previous_day.strftime('%Y-%m-%d')
        previous_day_cases = get_case_count(output_data,
            previous_day_string, row[FIPS], output_fips_first)
        # Any preceding day with a case count higher than the
        # current day's case count is considered to be in error.
        # The erroneous case(s) was either found to be incorrect
        # or was reassigned to another FIPS. We adjust these
        # preceding days down to the count of the current.
        while previous_day_cases and previous_day_cases > cases:
            previous_days_adjusted_down += 1
            set_case_count(output_data, previous_day_string,
                row[FIPS], cases, output_fips_first)
            # Reassign previous_day and previous_day_string to
            # continue the loop, looking for preceding entries
            # that were also higher than the current.
            previous_day = previous_day - timedelta(days=1)
            previous_day_string = \
                previous_day.strftime('%Y-%m-%d')
            previous_day_cases = get_case_count(output_data,
                previous_day_string, row[FIPS], output_fips_first)

        # Store the number of cases in the fips list at the position which
        # represents the number of days since the latest (current) date.
        day_offset = (latest_date - this_date).days
        fips_row = inverse_chronological_case_data[row[FIPS]]
        fips_row[day_offset] = cases
        # If the previous days had an erroneous count (explained above),
        # we adjust them down in this list as well.
        if previous_days_adjusted_down > 0:
            for i in range(1, previous_days_adjusted_down + 1):
                fips_row[day_offset + i] = cases

    return output_data, inverse_chronological_case_data


def generate_covid_data(covid_data: list, output_data: dict,
        growth_metric_days: int, output_fips_first: bool,
        is_state_file: bool=False) -> dict:
    """
    For supplied list containing either state or county covid data,
    this function will output a date-keyed dict in the format:
      {"YYYY-MM-DD":
         {"FIPS_ID": {"cases": X, "growth_factor": X.X}, ...}
       ...
      }

      Example:
      {"2020-03-27":
         {"56043": {"cases": 12, "growth_factor": 1.19}, ...}
       ...
      }

    Alternatively, when output_fips_first=True, the format will be:
      {"FIPS_ID":
         {"YYYY-MM-DD": {"cases": X, "growth_factor": X.X}, ...}
       ...
      }

      Example:
      {"56043":
         {"2020-03-27": {"cases": 12, "growth_factor": 1.19}, ...}
       ...
      }
    """
    # Offsets of the data within the csv.
    # Example: 2020-03-28,Snohomish,Washington,53061,912,23
    DATE = 0

    earliest_date = \
        datetime.strptime(covid_data[1][DATE], '%Y-%m-%d').date()
    latest_date = datetime.strptime(
        covid_data[-1][DATE], '%Y-%m-%d').date()
    # Create an empty list for each entry with length being the total days
    # we might have data for.
    # This will store case count in reverse chronological order.
    total_days_of_data = (latest_date - earliest_date).days + 1
    inverse_chronological_case_data = \
        defaultdict(lambda: [None] * total_days_of_data)

    output_data, inverse_chronological_case_data = record_case_counts(
            covid_data, output_data, inverse_chronological_case_data,
            output_fips_first, is_state_file, latest_date)

    output_data = record_growth_metrics(output_data,
            inverse_chronological_case_data, output_fips_first,
            growth_metric_days, latest_date, total_days_of_data)

    return output_data


def generate_case_json(county_input: list, state_input: list, output_file: str,
        growth_metric_days: int) -> None:
    empty_data = defaultdict(dict)
    state_data = generate_covid_data(
        state_input, empty_data, growth_metric_days, False,
        is_state_file=True)
    state_and_county_data = generate_covid_data(
        county_input, state_data, growth_metric_days, False)

    json_str = json.dumps(state_and_county_data)
    json_bytes = json_str.encode("utf-8")
    with gzip.GzipFile(output_file, "w") as output:
        output.write(json_bytes)

    return output_file
