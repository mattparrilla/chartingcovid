import initTrendChart, { updateTrendChart } from './trendChart';
import initDataTable, { updateTable } from './dataTable';
import initStateSelector, { updateSelectors } from './location';
import initCaseCountMap, { updateMapZoom } from "./caseCountMap";
import initDataManager from './dataManager';
import initLocationManager from './locationManager';
import initLineChart, { updateLineChart } from './lineChart';
import router from './router';

async function updateLabels(fips) {
  const fipsLabels = await window.dataManager.getFullName(fips);
  let label = "the United States";
  if (fipsLabels.county) {
    label = `${fipsLabels.county}, ${fipsLabels.state}`;
  } else if (fipsLabels.state) {
    label = fipsLabels.state;
  }
  document.querySelectorAll(".js_location_name").forEach(span => {
    span.innerHTML = label;
  });
}

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
      updateLabels();
      updateSelectors();
      updateMapZoom();
      updateLineChart();
      updateTrendChart();
      updateTable();
    })

    .add('state/(:any)', async (state) => {
      const fips = await window.dataManager.getFipsForStateUrl(state);
      window.locationManager.updateFips(fips);
      updateLabels(window.locationManager.getStateFips());
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
      updateLabels(window.locationManager.getCountyFips());
      updateSelectors();
      updateMapZoom();
      updateLineChart();
      updateTrendChart();
      updateTable();
    })
    .addUriListener()
    .navigateTo(window.location.pathname);
});
