import initTrendChart, { updateTrendChart } from './trendChart';
import initDataTable, { updateTable } from './dataTable';
import initStateSelector, { updateSelectors } from './location';
import initCaseCountMap, { updateMapZoom } from "./caseCountMap";
import initDataManager from './dataManager';
import initLocationManager from './locationManager';
import initLineChart, { updateLineChart } from './lineChart';
import router from './router';

// TODO: handle 404s (replace alerts)
window.addEventListener("DOMContentLoaded", () => {
  initDataManager();
  initLocationManager();
  initStateSelector();
  initCaseCountMap();
  initTrendChart();
  initDataTable();
  initLineChart();

  router
    .add('', () => {
      window.locationManager.updateFips();
      updateSelectors();
      updateMapZoom();
      updateLineChart();
      updateTrendChart();
      updateTable();
    })

    .add('state/(:any)', async (state) => {
      const fips = await window.dataManager.getFipsForStateUrl(state);
      window.locationManager.updateFips(fips);
      updateSelectors();
      updateMapZoom();
      updateLineChart();
      updateTrendChart();
      updateTable();
    })

    .add('state/(:any)/county/(:any)', async (state, county) => {
      const countyFips = await window.dataManager.getFipsForCountyUrl(county, state);
      const stateFips = await window.dataManager.getFipsForStateUrl(state);
      window.locationManager.updateFips(stateFips, countyFips);
      updateSelectors();
      updateMapZoom();
      updateLineChart();
      updateTrendChart();
      updateTable();
    })
    .addUriListener()
    .navigateTo(window.location.pathname);
});
