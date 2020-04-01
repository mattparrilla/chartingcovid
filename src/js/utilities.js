// Replace spaces with '-' and convert to lowercase
export function urlifyName(name) {
  return name.replace(" County", "").replace(/\s/g, '-').toLowerCase();
}

export async function countyToFips(fipsData, state, county) {
  const fips = await fipsData;
  return Object.keys(fips).find(item => (
    // State in FIPS json is ex: New Jersey
    urlifyName(fips[item].state) === state
    // County in FIPS json is ex: Bergen County
      && urlifyName(fips[item].county) === county
  ));
}

export async function stateToFips(fipsData, state) {
  const fips = await fipsData;
  return Object.keys(fips).find(item => (
    urlifyName(fips[item].state) === state
  ));
}

export function filterOutCounties(data) {
  return Object.keys(data).filter(fips => data[fips].county === "");
}

// Sort dates in ascending order
export function sortDateString(dates) {
  return Object.keys(dates).sort((firstEl, secondEl) => new Date(firstEl) - new Date(secondEl));
}
