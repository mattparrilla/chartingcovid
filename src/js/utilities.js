import { json } from 'd3';

export function fetchData() {
  return Promise.all([
    json("/data/fips_data.json"),
    json("/data/covid_cases_by_date.json"),
    json("/data/counties-albers-10m2.json")
  ]);
}

export function filterOutCounties(data) {
  return Object.keys(data)
    .reduce((stateData, fips) => {
      if (data[fips].county === "") {
        return [
          ...stateData,
          {
            fips,
            ...data[fips]
          }
        ];
      }
      return stateData;
    }, []);
}

// Sort dates in ascending order
export function sortDateString(dates) {
  return Object.keys(dates).sort((firstEl, secondEl) => new Date(firstEl) - new Date(secondEl));
}
