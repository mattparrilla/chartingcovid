import { filterOutCounties, urlifyName } from './utilities';
import router from './router';

export default async function initLocationSelector(data, stateFips, countyFips) {
  const fipsData = await data.fips;
  const stateSelector = document.getElementById("js_select_state");
  const countySelector = document.getElementById("js_select_county");

  function populateSelector(selector, key, selectedFips) {
    return fips => {
      const option = document.createElement("option");
      option.value = fips;
      option.text = fipsData[fips][key];
      option.selected = fips === selectedFips;
      selector.add(option);
    };
  }

  const states = filterOutCounties(fipsData);
  states.forEach(populateSelector(stateSelector, "state", stateFips));
  stateSelector.addEventListener("change", (e) => {
    const state = urlifyName(fipsData[e.target.value].state);
    router.navigateTo(`/state/${state}`);
    countySelector.value = null

  });

  const counties = Object.keys(fipsData).filter(fips => fipsData[fips].county);
  counties.forEach(populateSelector(countySelector, "county", countyFips));
  countySelector.addEventListener("change", (e) => {
    console.log(e.target.value);
  });
}
