import { filterOutCounties, sortDateString } from './utilities';

// Used to store our table data for sorting, etc
let tableData;

function sortRowsByColumn(sortColumn) {
  const intColumns = ["cases"];
  const floatColumns = ["cases_per_capita", "moving_avg"];

  return function sortRows(a, b) {
    if (intColumns.includes(sortColumn)) {
      return parseInt(b[sortColumn], 10) - parseInt(a[sortColumn], 10);
    }

    if (floatColumns.includes(sortColumn)) {
      return parseFloat(b[sortColumn]) - parseFloat(a[sortColumn]);
    }

    return a[sortColumn] < b[sortColumn] ? 1 : -1;
  };
}

// Put data in table and sort. Order: State, Cases, Cases Per Capita, Growth Rate
async function updateTable(data, state, countyFips, sortColumn = "state", descendingSort = true) {
  const casesByDate = await data.cases;
  const fipsData = await data.fips;
  const dates = sortDateString(casesByDate);
  const today = casesByDate[dates[dates.length - 1]];

  // if we are at country level
  if (state == null) {
    const stateData = filterOutCounties(fipsData);

    // Merge FIPS data with case data and calculate
    tableData = stateData.map(stateFips => ({
      ...stateFips,
      ...today[stateFips.fips],
      // using underscores to match style of source data
      cases_per_capita: today[stateFips.fips].cases / stateFips.population
    }));
  } else {
    const dataByState = Object.keys(fipsData).filter(item => (
      fipsData[item].state.replace(/\s/g, '-').toLowerCase() === state));

    tableData = dataByState.map(county => ({
      ...fipsData[county],
      ...today[county],
      cases_per_capita: today[county].cases / county.population
    }));
  }
  // sort rows in place
  tableData.sort(sortRowsByColumn(sortColumn));

  // TODO: to improve performance, could do this in sortRowsByColumn
  if (!descendingSort) {
    tableData.reverse();
  }

  // Only show county column header if we are looking at county level data
  document.getElementById("county_header").style.display = tableData[0].county ? "table-cell" : "none";

  // Only show state if we are looking at whole country
  document.getElementById("state_header").style.display = state ? "none" : "table-cell";

  const tbody = document.getElementById("js_tbody");
  tbody.innerHTML = tableData.map(row => `
    <tr>
      ${row.county ? `<td>${row.county}</td>` : ""}
      <td>${row.state}</td>
      <td class="number">${row.cases.toLocaleString()}</td>
      <td class="number">${(row.cases / row.population).toLocaleString(undefined, {
        minimumFractionDigits: 5
      })}</td>
      <td class="number">${(row.moving_avg).toLocaleString(undefined, {
        style: "percent",
        minimumFractionDigits: 2,
      })}</td>
    </tr>`).join('');
}

export default function initDataTable(data, state, countyFips) {
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
      updateTable(data, state, countyFips, th.dataset.column, descendingSort);
    });
  });

  // init our table
  updateTable(data, state, countyFips, "cases");
}
