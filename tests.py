import unittest
from collections import defaultdict

from create_covid_json import read_covid_file


class TestParseVariants(unittest.TestCase):
    def test_single_variant(self):
        expected_output = defaultdict(dict, {
            "2020-01-21": {
                "53061": {
                    "cases": 1,
                }
            },
            "2020-01-22": {
                "53061": {
                    "cases": 1,
                }
            },
            "2020-01-23": {
                "53061": {
                    "cases": 1,
                    "moving_avg": 0
                }
            }
        })
        output_data = defaultdict(dict)
        self.assertEqual(read_covid_file("test_data/us-counties-mock.csv",
                                         output_data, 3, False),
                         expected_output)


if __name__ == "__main__":
    unittest.main()
