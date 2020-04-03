import { urlifyName } from './utilities';
import router from './router';

// Used to store our table data for sorting, etc
let tableData;

// Handle link click in table, redirect and scroll to top
function handleTableLinkClick() {
  document.querySelectorAll("#js_tbody a").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      window.scrollTo({ top: 0 });
      router.navigateTo(e.target.dataset.href);
    });
  });
}

function sortRowsByColumn(sortColumn) {
  const intColumns = ["cases"];
  const floatColumns = ["cases_per_capita", "moving_avg"];

  return function sortRows(a, b) {
    // Always push null to the bottom
    if (a[sortColumn] == null || b[sortColumn] == null) {
      return 1;
    }
    if (intColumns.includes(sortColumn)) {
      return parseInt(b[sortColumn], 10) - parseInt(a[sortColumn], 10);
    }

    if (floatColumns.includes(sortColumn)) {
      return parseFloat(b[sortColumn]) - parseFloat(a[sortColumn]);
    }
    return a[sortColumn] < b[sortColumn] ? 1 : -1;
  };
}

// Create county or state table cell
function placeCell(state, county) {
  const stateUrl = urlifyName(state);
  if (county) {
    const countyUrl = urlifyName(county);
    const href = `/state/${stateUrl}/county/${countyUrl}`;
    return `<td><a data-href="${href}" href="${href}">${county}</td>`;
  }
  const href = `/state/${stateUrl}`;
  return `<td><a data-href="${href}" href="${href}">${state}</td>`;
}

// Truncate results if over 500 and update markup on page
function updateTableMarkup() {
  const truncatedData = tableData.length > 500 ? tableData.slice(0, 100) : tableData;

  const tbody = document.getElementById("js_tbody");
  tbody.innerHTML = truncatedData.map((row, i) => `
    <tr ${row.highlight ? 'class="highlight"' : ''}>
      <td class="number">${i + 1}</td>
      ${row.county ? placeCell(row.state, row.county) : ""}
      ${window.locationManager.isCountryView() ? placeCell(row.state) : ""}
      <td class="number">${(row.cases || "").toLocaleString()}</td>
      <td class="number">${(row.cases_per_capita || "").toLocaleString(undefined, {
        minimumFractionDigits: 5
      })}</td>
      <td class="number">${(row.growth_factor || "").toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}</td>
      <td class="number">${(row.doubling_time || "").toLocaleString(undefined, {
        minimumFractionDigits: 1,
      })}</td>
    </tr>`).join('');
}

function sortTable(sortColumn = "cases", descendingSort = true) {
  // sort rows in place
  tableData.sort(sortRowsByColumn(sortColumn));

  // TODO: to improve performance, could do this in sortRowsByColumn
  if (!descendingSort) {
    tableData.reverse();
  }

  updateTableMarkup();
}

async function fipsToTableRows({ state, county, population, fips }) {
  const today = await window.dataManager.getMostRecentData();
  const countyFips = window.locationManager.getCountyFips();

  // if we have cases reported today
  if (today[fips]) {
    return Promise.resolve({
      county,
      state,
      highlight: countyFips === fips,
      ...today[fips],
      cases_per_capita: today[fips].cases / population
    });
  }
  // no cases reported for given gips
  return Promise.resolve({
    county,
    state,
    highlight: countyFips === fips,
    cases: null,
    cases_per_capita: null,
    moving_avg: null
  });
}

// Put data in table and sort. Order: State, Cases, Cases Per Capita, Growth Rate
export async function updateTable(showUSCounties = false) {
  const isCountryView = window.locationManager.isCountryView();

  // Add disclaimer if we are in country view and showing all US counties
  document.getElementById("js_county_disclaimer").style.display = showUSCounties && isCountryView
    ? "block"
    : "none";

  document.getElementById("js_table_county_vs_state").style.display = isCountryView ? "block" : "none";

  // Only hide county column header if we are looking at county level data but
  // not all US counties
  document.getElementById("county_header").style.display =
    !showUSCounties && window.locationManager.isCountryView() ? "none" : "table-cell";

  // Only show state if we are looking at whole country
  document.getElementById("state_header").style.display = isCountryView ? "table-cell" : "none";

  if (isCountryView) {
    if (showUSCounties) {
      const allCountyFips = await window.dataManager.getAllCounties();
      tableData = await Promise.all(allCountyFips.map(fipsToTableRows));
    } else { // just show state level data in table
      const states = await window.dataManager.getAllStates();
      tableData = await Promise.all(states.map(fipsToTableRows));
    }
  // Munge data for state or county
  } else {
    const stateFips = window.locationManager.getStateFips();
    const dataByState = await window.dataManager.getCountiesGivenState(stateFips);
    tableData = await Promise.all(dataByState.map(fipsToTableRows));
  }

  sortTable();
  handleTableLinkClick();
}


export default function initDataTable() {
  // Add handlers to sort on column header click
  const tableHeaders = document.querySelectorAll("#js_thead th");
  tableHeaders.forEach(th => {
    let descendingSort = th.classList.contains("descending");
    th.addEventListener("click", () => {
      // remove sort class from any other element
      tableHeaders.forEach(header => {
        header.classList.remove("ascending");
        header.classList.remove("descending");
      });

      descendingSort = !descendingSort;
      th.classList.add(descendingSort ? "descending" : "ascending");
      sortTable(th.dataset.column, descendingSort);
    });
  });

  // Handle toggle between showing state and counties in table at US level
  const tableRowOptions = document.querySelectorAll("#js_table_county_vs_state span");
  tableRowOptions.forEach(option => {
    option.addEventListener("click", () => {
      tableRowOptions.forEach(item => item.classList.remove("active"));
      option.classList.add("active");
      updateTable(option.dataset.type === "county");
    });
  });
}
