import { filterOutCounties, urlifyName } from './utilities';
import router from './router';

// Given a fips, alphabetically sort the data by key
function alphabeticalSortByFips(fipsData, key) {
  return (a, b) => fipsData[a][key] > fipsData[b][key] ? 1 : -1;
}

// Populate the select element with options
function populateSelector(fipsData, selector, key, selectedFips) {
  return fips => {
    const option = document.createElement("option");
    option.value = fips;
    option.text = fipsData[fips][key];
    option.selected = fips === selectedFips;
    selector.add(option);
  };
}


export async function updateSelectors(data, stateFips, countyFips) {
  const fipsData = await data.fips;
  const stateSelector = document.getElementById("js_select_state");
  const countySelector = document.getElementById("js_select_county");
  countySelector.value = null;

  // if we have a state selected, clear existing county options and populate
  if (stateFips) {
    stateSelector.value = stateFips;
    countySelector.style.display = "inline-block";
    countySelector.innerHTML = "<option>Choose County</option>";
    Object.keys(fipsData).filter(fips => (
      fipsData[fips].county && fipsData[fips].state === fipsData[stateFips].state))
      .sort(alphabeticalSortByFips(fipsData, "county"))
      .forEach(populateSelector(fipsData, countySelector, "county", countyFips));
  } else {
    countySelector.style.display = "none";
  }
}

export default async function initStateSelector(data) {
  const fipsData = await data.fips;
  const stateFips = window.locationManager.getStateFips();
  const stateSelector = document.getElementById("js_select_state");
  const countySelector = document.getElementById("js_select_county");

  // Populate state select element
  filterOutCounties(fipsData)
    .sort(alphabeticalSortByFips(fipsData, "state"))
    .forEach(populateSelector(fipsData, stateSelector, "state", stateFips));

  // event listener for state select element
  stateSelector.addEventListener("change", async (e) => {
    window.locationManager.setState(e.target.value);
  });

  // event listener for county select element
  countySelector.addEventListener("change", (e) => {
    window.locationManager.setCounty(e.target.value);
  });
}
