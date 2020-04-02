import initTrendChart, { updateTrendChart } from './trendChart';
import initDataTable, { updateTable } from './dataTable';
import initStateSelector, { updateSelectors } from './location';
import initCaseCountMap from "./caseCountMap";
import initDataManager from './dataManager';
import initLocationManager from './locationManager';
import router from './router';

// TODO: handle 404s (replace alerts)
window.addEventListener("DOMContentLoaded", () => {
  initDataManager();
  initLocationManager();
  initStateSelector();
  initCaseCountMap();
  initTrendChart();
  initDataTable();


  router
    .add('', () => {
      window.locationManager.updateFips();
      updateSelectors();
      updateTrendChart();
      updateTable();
    })

    .add('state/(:any)', async (state) => {
      const fips = await window.dataManager.getFipsForStateUrl(state);
      window.locationManager.updateFips(fips);

      console.log(`State: ${state}; FIPS: ${fips}`);
      if (!fips) {
        window.alert(`fips for: ${state} not found`);
      }

      updateSelectors();
      updateTrendChart();
      updateTable();
    })

    .add('state/(:any)/county/(:any)', async (state, county) => {
      const countyFips = await window.dataManager.getFipsForCountyUrl(county, state);
      const stateFips = await window.dataManager.getFipsForStateUrl(state);
      window.locationManager.updateFips(stateFips, countyFips);

      console.log(`State: ${state}; County: ${county}; FIPS: ${countyFips}`);
      if (!countyFips) {
        window.alert(`fips for: ${county}, ${state} not found`);
      }

      updateSelectors();
      updateTrendChart();
      updateTable();
    })
    .addUriListener()
    .navigateTo(window.location.pathname);
});
