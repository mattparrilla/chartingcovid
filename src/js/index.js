import { json } from 'd3';
import initTrendChart from './trendChart';
import initDataTable from './dataTable';
import { stateToFips, countyToFips } from './utilities';
import initLocationSelector from './location';
import router from './router';

window.addEventListener("DOMContentLoaded", () => {
  // kick off data calls
  const data = {
    fips: json("/data/fips_data.json"),
    cases: json("/data/covid_cases_by_date.json")
  };

  const tableDisplayToggle = document.getElementById("js_table_county_vs_state");
  window.chartingCovid = {};

  router.add('', () => {
    window.chartingCovid.fips = null;
    tableDisplayToggle.style.display = "block";
    initTrendChart(data);
    initDataTable({ data });
    initLocationSelector(data);
  });

  router.add('state/(:any)', async (state) => {
    tableDisplayToggle.style.display = "none";
    const fips = await stateToFips(data.fips, state);
    console.log(`State: ${state}; FIPS: ${fips}`);
    // TODO: handle if FIPS not found
    if (!fips) {
      window.alert(`fips for: ${state} not found`);
    }
    window.chartingCovid.fips = fips;
    initTrendChart(data, fips);
    initDataTable({ data, state });
    initLocationSelector(data, fips);
  });

  router.add('state/(:any)/county/(:any)', async (state, county) => {
    tableDisplayToggle.style.display = "none";
    const countyFips = await countyToFips(data.fips, state, county);
    const stateFips = await stateToFips(data.fips, state);

    console.log(`State: ${state}; County: ${county}; FIPS: ${countyFips}`);
    // TODO: handle if FIPS not found
    if (!countyFips) {
      window.alert(`fips for: ${county}, ${state} not found`);
    }

    window.chartingCovid.fips = countyFips;
    initTrendChart(data, countyFips);
    initDataTable({ data, state, countyFips });
    initLocationSelector(data, stateFips, countyFips);
  });

  router.addUriListener();
  router.navigateTo(window.location.pathname);
});
