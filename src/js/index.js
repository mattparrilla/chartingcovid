import { json } from 'd3';
import initTrendChart from './trendChart';
import initDataTable from './dataTable';
import initStateSelector, { updateSelectors } from './location';
import initCaseCountMap from "./caseCountMap";
import router from './router';
import initDataManager from './dataManager';
import initLocationManager from './locationManager';

// TODO: handle 404s (replace alerts)
window.addEventListener("DOMContentLoaded", () => {
  // kick off data calls
  const data = {
    fips: json("/data/fips_data.json"),
    cases: json("/data/covid_cases_by_date.json"),
    countyOutline: json("/data/counties-albers-10m2.json")
  };

  initDataManager();

  const tableDisplayToggle = document.getElementById("js_table_county_vs_state");

  router.add('', () => {
    initLocationManager();
    initStateSelector();
    // TODO: move table display to table
    tableDisplayToggle.style.display = "block";
    initCaseCountMap(data);
    initTrendChart(data);
    initDataTable({ data });
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
    updateSelectors(fips);
    initTrendChart(data, fips);
    initDataTable({ data, state });
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
    updateSelectors(stateFips, countyFips);
    initTrendChart(data, countyFips);
    initDataTable({ data, state, countyFips });
  });

  router.addUriListener();
  router.navigateTo(window.location.pathname);
});
