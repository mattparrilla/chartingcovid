import { fetchData, filterOutCounties, sortDateString } from './utilities';

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

    return a[sortColumn] > b[sortColumn] ? 1 : -1;
  };
}

// Put data in table and sort. Order: State, Cases, Cases Per Capita, Growth Rate
function updateTable(rows, sortColumn = "state", descendingSort = true) {
  // sort rows in place
  rows.sort(sortRowsByColumn(sortColumn));

  // TODO: to improve performance, could do this in sortRowsByColumn
  if (!descendingSort) {
    rows.reverse();
  }

  // Only show county column header if we are looking at county level data
  document.getElementById("county_header").style.display = rows[0].county ? "table-cell" : "none";

  const tbody = document.getElementById("js_tbody");
  tbody.innerHTML = rows.map(row => `
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

export default async function initDataTable() {
  const [fipsData, casesByDate] = await fetchData();
  const dates = sortDateString(casesByDate);
  const today = casesByDate[dates[dates.length - 1]];
  const stateData = filterOutCounties(fipsData);

  // Merge FIPS data with case data and calculate
  const mergedStateData = stateData.map(stateFips => ({
    ...stateFips,
    ...today[stateFips.fips],
    // using underscores to match style of source data
    cases_per_capita: today[stateFips.fips].cases / stateFips.population
  }));

  // Add handlers to sort on column header click
  document.querySelectorAll("#js_thead th").forEach(th => {
    let descendingSort = false;
    th.addEventListener("click", () => {
      descendingSort = !descendingSort;
      updateTable(mergedStateData, th.dataset.column, descendingSort);
    });
  });

  // init our table
  updateTable(mergedStateData, "cases");
}
