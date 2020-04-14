import unittest
import math
from collections import defaultdict

from charting_covid_data.chalicelib.create_covid_json import get_growth_factor, generate_covid_data


class TestDataMunging(unittest.TestCase):
    def test_get_growth_factor(self):
        input = [150, 120, 100, 90, 80]
        output = 1.5
        self.assertEqual(get_growth_factor(input), output)

    def test_simple_growth(self):
        input = [
            ['date', 'county', 'state', 'fips', 'cases', 'deaths'],
            ['2020-01-21', 'Snohomish', 'Washington', '53061', '50', '0'],
            ['2020-01-22', 'Snohomish', 'Washington', '53061', '51', '0'],
            ['2020-01-23', 'Snohomish', 'Washington', '53061', '52', '0']]
        fips_data = {
            "53061": {"county": "Snohomish", "state": "Washington",
                "population": 100}
        }

        growth_factor = float(52 - 51) / (51 - 50)
        latest_growth_rate = math.log(52 / 51)
        latest_doubling_time = math.log(2) / math.log(1 + latest_growth_rate)

        earlier_growth_rate = math.log(52 / 50) / 2
        earlier_doubling_time = math.log(2) / math.log(1 + earlier_growth_rate)
        doubling_time = (latest_doubling_time + earlier_doubling_time) / 2
        expected_output = defaultdict(dict, {
            "2020-01-20": {},
            "2020-01-21": {
                "53061": {
                    "cases": 50,
                    "per_capita": 0.5
                }
            },
            "2020-01-22": {
                "53061": {
                    "cases": 51,
                    "increase": 1,
                    "per_capita": 0.51
                }
            },
            "2020-01-23": {
                "53061": {
                    "cases": 52,
                    "increase": 1,
                    "per_capita": 0.52,
                    "doubling_time": doubling_time,
                    "growth_factor": growth_factor
                }
            }
        })
        output_data = defaultdict(dict)
        self.assertEqual(generate_covid_data(input,
                                             output_data,
                                             fips_data,
                                             3,
                                             False),
                         expected_output)

if __name__ == "__main__":
    unittest.main()
