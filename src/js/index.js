import Router from 'vanilla-router';
import initTrendChart from './trendChart';
import initDatatTable from './dataTable';
import { stateToFips, countyToFips } from './utilities';

export const router = new Router({
  mode: 'history'
});

window.addEventListener("DOMContentLoaded", () => {
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
