import { urlifyName } from './utilities';
import router from './router';

// Given an array of fips, alphabetically sort the data by key
function alphabeticalSortByFips(key) {
  return (a, b) => a[key] > b[key] ? 1 : -1;
}

// Populate the select element with options
function populateSelector(selector, key, selectedFips) {
  return entry => {
    const option = document.createElement("option");
    option.value = entry.fips;
    option.text = entry[key];
    option.selected = entry.fips === selectedFips;
    selector.add(option);
  };
}


export async function updateSelectors() {
  const stateFips = window.locationManager.getStateFips();
  const countyFips = window.locationManager.getCountyFips();
  const stateSelector = document.getElementById("js_select_state");
  const countySelector = document.getElementById("js_select_county");
  const homeLink = document.getElementById("js_home");
  countySelector.value = "";

  // if we have a state selected, clear existing county options and populate
  if (stateFips) {
    stateSelector.value = stateFips;
    countySelector.style.display = "inline-block";
    countySelector.innerHTML = "<option>Choose County</option>";
    const counties = await window.dataManager.getCountiesGivenState(stateFips);
    counties
      .sort(alphabeticalSortByFips("county"))
      .forEach(populateSelector(countySelector, "county", countyFips));
    homeLink.classList.remove("active");

    // show NYC disclaimer if NY is selected
    document.getElementById("js_ny_disclaimer").style.display =
      stateFips == 36 ? "block" : "none";

    if (countyFips) {
      stateSelector.classList.remove("active");
      countySelector.classList.add("active");
    } else {
      countySelector.classList.remove("active");
      stateSelector.classList.add("active");
    }
  } else {
    stateSelector.value = "";
    countySelector.value = "";
    countySelector.style.display = "none";
    homeLink.classList.add("active");
    stateSelector.classList.remove("active");
    countySelector.classList.remove("active");
  }
}

export default async function initStateSelector() {
  const selectedState = window.locationManager.getStateFips();
  const stateSelector = document.getElementById("js_select_state");
  const countySelector = document.getElementById("js_select_county");

  // Populate state select element
  const states = await window.dataManager.getAllStates();
  states
    .sort(alphabeticalSortByFips("state"))
    .forEach(populateSelector(stateSelector, "state", selectedState));

  // event listener for state select element
  stateSelector.addEventListener("change", async (e) => {
    const fips = e.target.value;
    const state = urlifyName(await window.dataManager.getFipsStateName(fips));
    router.navigateTo(`/state/${state}`);
  });

  // event listener for county select element
  countySelector.addEventListener("change", async (e) => {
    const fips = e.target.value;
    const state = urlifyName(await window.dataManager.getFipsStateName(fips));
    const county = urlifyName(await window.dataManager.getFipsCountyName(fips));
    router.navigateTo(`/state/${state}/county/${county}`);
  });

  document.getElementById("js_home").addEventListener("click", e => {
    e.preventDefault();
    window.scrollTo({ top: 0 });
    router.navigateTo("");
  });
}
