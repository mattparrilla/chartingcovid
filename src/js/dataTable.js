import { json } from 'd3';

function filterOutCounties(data) {
  return Object.keys(data)
    .reduce((stateData, fips) => {
      if (data[fips].county === "") {
        return [
          ...stateData,
          {
            fips,
            ...data[fips]
          }
        ];
      }
      return stateData;
    }, []);
}

function sortDateString(dates) {
  return Object.keys(dates).sort((firstEl, secondEl) => new Date(secondEl) - new Date(firstEl));
}

function sortRowsByColumn(sortColumn) {
  const intColumns = ["cases"];
  const floatColumns = ["casesPerCapita", "growthRate"];
  return function sortRows(a, b) {
    if (intColumns.includes(sortColumn)) {
      return parseInt(b[sortColumn], 10) - parseInt(a[sortColumn], 10);
    } else if (floatColumns.includes(sortColumn)) {
      return parseFloat(b[sortColumn]) - parseFloat(a[sortColumn]);
    } else {
      return a > b;
    }
  };
}

function updateTable(rows, sortColumn = "state") {
  // sort rows in place
  rows.sort(sortRowsByColumn(sortColumn));

  const tbody = document.getElementById("js_tbody");
  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.state}</td>
      <td>${row.cases}</td>
      <td>${row.cases / row.population}</td>
      <td>${row.moving_avg}</td>
    </tr>`).join('');
}

export default async function initDataTable() {
  const [fipsData, casesByDate] = await Promise.all([
    json("/data/fips_data.json"),
    json("/data/covid_cases_by_date.json")
  ]);

  const dates = sortDateString(casesByDate);
  const today = casesByDate[dates[0]];
  const stateData = filterOutCounties(fipsData);

  // Add case data to state population data (and calculate per capita)
  const mergedStateData = stateData.map(stateFips => ({
    ...stateFips,
    ...today[stateFips.fips],
    casesPerCapita: today[stateFips.fips].cases / stateFips.population
  }));

  updateTable(mergedStateData, "cases");

  // Put data in table: State, Cases, Cases Per Capita, Growth Rate
}
