import { json } from 'd3';
import initTrendChart from './trendChart';
import initDataTable from './dataTable';
import { stateToFips, countyToFips } from './utilities';
import initStateSelector, { updateSelectors } from './location';
import initCaseCountMap from "./caseCountMap";
import router from './router';
import initDataManager from './dataManager';
import initLocationManager from './locationManager';

function init(data) {
  initStateSelector(data);
  initLocationManager();
  initDataManager();
}

// TODO: handle 404s (replace alerts)
window.addEventListener("DOMContentLoaded", () => {
  // kick off data calls
  const data = {
    fips: json("/data/fips_data.json"),
    cases: json("/data/covid_cases_by_date.json"),
    countyOutline: json("/data/counties-albers-10m2.json")
  };

  init(data);

  const tableDisplayToggle = document.getElementById("js_table_county_vs_state");

  // TODO: do I need this object?
  window.chartingCovid = {};
  router.add('', () => {
    tableDisplayToggle.style.display = "block";
    initCaseCountMap(data);
    initTrendChart(data);
    initDataTable({ data });
  });

  router.add('state/(:any)', async (state) => {
    tableDisplayToggle.style.display = "none";
    const fips = await stateToFips(data.fips, state);
    console.log(`State: ${state}; FIPS: ${fips}`);
    if (!fips) {
      window.alert(`fips for: ${state} not found`);
    }
    window.chartingCovid.fips = fips;
    initTrendChart(data, fips);
    initDataTable({ data, state });
    updateSelectors(data, fips);
  });

  router.add('state/(:any)/county/(:any)', async (state, county) => {
    tableDisplayToggle.style.display = "none";
    const countyFips = await countyToFips(data.fips, state, county);
    const stateFips = await stateToFips(data.fips, state);

    console.log(`State: ${state}; County: ${county}; FIPS: ${countyFips}`);
    if (!countyFips) {
      window.alert(`fips for: ${county}, ${state} not found`);
    }

    window.chartingCovid.fips = countyFips;
    initTrendChart(data, countyFips);
    initDataTable({ data, state, countyFips });
    updateSelectors(data, stateFips, countyFips);
  });

  router.addUriListener();
  router.navigateTo(window.location.pathname);
});
