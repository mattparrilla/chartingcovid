import Router from 'vanilla-router';
import { json } from 'd3';
import initTrendChart from './trendChart';
import initDataTable from './dataTable';
import { stateToFips, countyToFips } from './utilities';

const router = new Router({
  mode: 'history'
});

window.addEventListener("DOMContentLoaded", () => {
  // kick off data calls
  const data = {
    fips: json("/data/fips_data.json"),
    cases: json("/data/covid_cases_by_date.json")
  };

  // TODO: create separate init and update functions for elements, all should
  // initialize without data

  // TODO: get fetchData promise here, await it in the view block

  router.add('', () => {
    initTrendChart(data);
    initDataTable(data);
  });

  router.add('state/(:any)', async (state) => {
    const fips = await stateToFips(data.fips, state);
    console.log(`State: ${state}; FIPS: ${fips}`);
    // TODO: handle if FIPS not found
    if (!fips) {
      window.alert(`fips for: ${state} not found`);
    }
    initTrendChart(data, fips);
    initDataTable({ data, state });
  });

  router.add('state/(:any)/county/(:any)', async (state, county) => {
    const fips = await countyToFips(data.fips, state, county);
    console.log(`State: ${state}; County: ${county}; FIPS: ${fips}`);
    // TODO: handle if FIPS not found
    if (!fips) {
      window.alert(`fips for: ${county}, ${state} not found`);
    }
    initTrendChart(data, fips);
    initDataTable({ data, state, countyFips: fips });
  });

  router.addUriListener();
  router.navigateTo(window.location.pathname);
});
