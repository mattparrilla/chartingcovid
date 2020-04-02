import initTrendChart, { updateTrendChart } from './trendChart';
import initDataTable from './dataTable';
import initStateSelector, { updateSelectors } from './location';
import initCaseCountMap from "./caseCountMap";
import initDataManager from './dataManager';
import initLocationManager from './locationManager';
import router from './router';

// TODO: handle 404s (replace alerts)
window.addEventListener("DOMContentLoaded", () => {
  initDataManager();
  initCaseCountMap();
  initTrendChart();

  const tableDisplayToggle = document.getElementById("js_table_county_vs_state");

  router.add('', () => {
    initLocationManager();
    initStateSelector();
    updateTrendChart();
    // TODO: move table display to table
    tableDisplayToggle.style.display = "block";
    // initDataTable({ data });
  });

  router.add('state/(:any)', async (state) => {
    tableDisplayToggle.style.display = "none";
    const fips = await window.dataManager.getFipsForStateUrl(state);
    initLocationManager({ state: fips });

    console.log(`State: ${state}; FIPS: ${fips}`);
    if (!fips) {
      window.alert(`fips for: ${state} not found`);
    }

    initStateSelector();
    updateTrendChart();
    updateSelectors(fips);
    // initDataTable({ data, state });
  });

  router.add('state/(:any)/county/(:any)', async (state, county) => {
    tableDisplayToggle.style.display = "none";
    const countyFips = await window.dataManager.getFipsForCountyUrl(county, state);
    const stateFips = await window.dataManager.getFipsForStateUrl(state);
    initLocationManager({ state: stateFips, county: countyFips });

    console.log(`State: ${state}; County: ${county}; FIPS: ${countyFips}`);
    if (!countyFips) {
      window.alert(`fips for: ${county}, ${state} not found`);
    }

    initStateSelector();
    updateTrendChart();
    updateSelectors(stateFips, countyFips);
    // initDataTable({ data, state, countyFips });
  });

  router.addUriListener();
  router.navigateTo(window.location.pathname);
});
