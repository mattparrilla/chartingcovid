import { json } from 'd3';

export async function countyToFips(fipsData, state, county) {
  const fips = await fipsData;
  return Object.keys(fips).find(item => (
    // State in FIPS json is ex: New Jersey
    fips[item].state.replace(/\s/g, "-").toLowerCase() === state
    // County in FIPS json is ex: Bergen County
      && fips[item].county.replace(" County", "").replace(/\s/g, "-").toLowerCase() === county
  ));
}

export async function stateToFips(fipsData, state) {
  const fips = await fipsData;
  return Object.keys(fips).find(item => (
    fips[item].state.replace(/\s/g, '-').toLowerCase() === state
  ));
}

export function fetchData() {
  return Promise.all([
    json("/data/fips_data.json"),
    json("/data/covid_cases_by_date.json")
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
