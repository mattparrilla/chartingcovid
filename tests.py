import unittest
from collections import defaultdict

from create_covid_json import get_growth_factor


class TestParseVariants(unittest.TestCase):
    def test_get_growth_factor(self):
        input = [150, 120, 100, 90, 80]
        output = 1.5
        self.assertEqual(get_growth_factor(input), output)


if __name__ == "__main__":
    unittest.main()
