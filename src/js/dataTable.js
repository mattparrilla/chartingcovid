import { filterOutCounties, sortDateString } from './utilities';

// Used to store our table data for sorting, etc
let tableData;

function sortRowsByColumn(sortColumn) {
  const intColumns = ["cases"];
  const floatColumns = ["cases_per_capita", "moving_avg"];

  return function sortRows(a, b) {
    if (a[sortColumn] == null) {
      return 1;
    }
    if (b[sortColumn] == null) {
      return -1;
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

// Truncate results if over 500 and update markup on page
function updateTableMarkup() {
  const truncatedData = tableData.length > 500 ? tableData.slice(0, 100) : tableData;

  const tbody = document.getElementById("js_tbody");
  tbody.innerHTML = truncatedData.map((row, i) => `
    <tr ${row.highlight ? 'class="highlight"' : ''}>
      <td class="number">${i + 1}</td>
      ${row.county ? `<td>${row.county}</td>` : ""}
      ${row.state ? `<td>${row.state}</td>` : ""}
      <td class="number">${(row.cases || "").toLocaleString()}</td>
      <td class="number">${(row.cases_per_capita || "").toLocaleString(undefined, {
        minimumFractionDigits: 5
      })}</td>
      <td class="number">${(row.moving_avg || "").toLocaleString(undefined, {
        style: "percent",
        minimumFractionDigits: 2,
      })}</td>
    </tr>`).join('');
}

function sortTable(sortColumn, descendingSort) {
  // sort rows in place
  tableData.sort(sortRowsByColumn(sortColumn));

  // TODO: to improve performance, could do this in sortRowsByColumn
  if (!descendingSort) {
    tableData.reverse();
  }

  updateTableMarkup();
}

// Put data in table and sort. Order: State, Cases, Cases Per Capita, Growth Rate
async function updateTable({
  data,
  state,
  countyFips,
  sortColumn = "cases",
  descendingSort = true,
  showAllCounties = false
}) {
  const casesByDate = await data.cases;
  const fipsData = await data.fips;
  const dates = sortDateString(casesByDate);
  const today = casesByDate[dates[dates.length - 1]];

  function fipsToTableRows(fips) {
    // if we have cases reported today
    if (today[fips]) {
      return {
        highlight: countyFips === fips,
        county: fipsData[fips].county,
        state: fipsData[fips].state,
        ...today[fips],
        cases_per_capita: today[fips].cases / fipsData[fips].population
      };
    }
    // no cases reported for given gips
    return {
      highlight: countyFips === fips,
      county: fipsData[fips].county,
      state: fipsData[fips].state,
      cases: null,
      cases_per_capita: null,
      moving_avg: null
    };
  }

  document.getElementById("js_county_disclaimer").style.display = showAllCounties
    ? "block"
    : "none";

  // if state is null, we are looking at US.
  if (state == null) {
    if (showAllCounties) {
      const allCountyFips = Object.keys(fipsData).filter(item => (
        fipsData[item].county !== "" // if county string is empty then we have a state
      ));
      tableData = allCountyFips.map(fipsToTableRows);
    } else { // just show state level data in table
      const states = filterOutCounties(fipsData);

      tableData = states.map(fipsToTableRows);
    }
  // Munge data for state or county
  } else {
    const dataByState = Object.keys(fipsData).filter(item => (
      // filter today's data to give us just counties within current state
      // regardless of if we have a county selected
      fipsData[item].state.replace(/\s/g, '-').toLowerCase() === state
      // filter out the top level state data (county is empty string)
      && fipsData[item].county));

    tableData = dataByState.map(fipsToTableRows);
  }
  // Only show county column header if we are looking at county level data
  document.getElementById("county_header").style.display = tableData[0].county ? "table-cell" : "none";

  // Only show state if we are looking at whole country
  document.getElementById("state_header").style.display = state ? "none" : "table-cell";

  sortTable(sortColumn, descendingSort, showAllCounties);
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
      sortTable(th.dataset.column, descendingSort);
    });
  });

  // Handle toggle between showing state and counties in table at US level
  const tableRowOptions = document.querySelectorAll("#js_table_county_vs_state span");
  tableRowOptions.forEach(option => {
    option.addEventListener("click", () => {
      tableRowOptions.forEach(item => item.classList.remove("active"));
      option.classList.add("active");
      updateTable({ data, state, countyFips, showAllCounties: option.dataset.type === "county" });
    });
  });

  // init our table
  updateTable({ data, state, countyFips });
}
