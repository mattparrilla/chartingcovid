import trendChart from "./trendChart";
import initTrendChart from "./trendChart";
import initDataTable from './dataTable';
import caseCountMap from "./caseCountMap";

window.addEventListener("DOMContentLoaded", () => {
  initTrendChart();
  initDataTable();
  caseCountMap();
});
