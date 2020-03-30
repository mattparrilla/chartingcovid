import Router from 'vanilla-router';
import initTrendChart from './trendChart';
import initDatatTable from './dataTable';
import { stateToFips, countyToFips } from './utilities';

const router = new Router({
  mode: 'history'
});

window.addEventListener("DOMContentLoaded", () => {
  // TODO: create separate init and update functions for elements, all should
  // initialize without data

  // TODO: get fetchData promise here, await it in the view block

  router.add('', () => {
    initTrendChart();
    initDatatTable();
  });

  router.add('state/(:any)', async (state) => {
    const fips = await stateToFips(state);
    console.log(`State: ${state}; FIPS: ${fips}`);
    // TODO: handle if FIPS not found
    if (!fips) {
      window.alert(`fips for: ${state} not found`);
    }
    initTrendChart(fips);
    initDatatTable(fips);
  });

  router.add('state/(:any)/county/(:any)', async (state, county) => {
    const fips = await countyToFips(state, county);
    console.log(`State: ${state}; County: ${county}; FIPS: ${fips}`);
    // TODO: handle if FIPS not found
    if (!fips) {
      window.alert(`fips for: ${county}, ${state} not found`);
    }
    initTrendChart(fips);
    initDatatTable(fips);
  });

  router.addUriListener();
  router.navigateTo(window.location.pathname);
});
