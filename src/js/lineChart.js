import * as d3 from "d3";

// set the dimensions and margins of the graph
const margin = { top: 20, right: 50, bottom: 30, left: 70 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;
const x = d3.scaleLinear().range([margin.left, width]);
const y = d3.scaleSymlog().range([height - margin.bottom, margin.top]);
const svg = d3.select("#js_days_since_chart")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);
const line = d3.line()
  .x((d, i) => x(i))
  // don't show values below 0
  .y((d) => d > 1 ? y(d) : y(0));

export async function updateLineChart() {
  const data = window.locationManager.isCountryView() ?
    await window.dataManager.getNewCasesAllStates() :
    await window.dataManager.getNewCasesGivenState(window.locationManager.getStateFips());

  // TODO: handle no data for state

  // TODO: filter out entries with only a single day of new cases
  // TODO: filter out last entry if number of cases is zero

  // Remove existing elements
  svg.selectAll("g .circle").remove();
  svg.selectAll("g .line").remove();
  svg.selectAll("g .label").remove();

  // Highlight
  const entriesByLength = Object.entries(data).sort((a, b) => (
    a[1].length > b[1].length ? 1 : -1
  ));
  const highlights = entriesByLength
    .slice(Math.max(entriesByLength.length - 5, 1))
    .map(([fips]) => fips);

  // TODO: Highlight seleted county if in map

  svg.append("g")
    .selectAll(".circle")
    .remove()
    .data(Object.keys(data))
    .enter()
    .append("circle")
      .attr("class", d => `${highlights.includes(d) ? "highlight" : d} circle`)
      .attr("r", 4)
      .attr("cx", d => x(data[d].length - 1))
      // TODO: avoid conflicts
      .attr("cy", d => y(data[d][data[d].length - 1]));

  svg.append("g")
    .selectAll(".line")
    .data(Object.keys(data))
    .enter()
    .append("path")
      .attr("class", d => `${highlights.includes(d) ? "highlight" : d} line`)
      .attr("d", d => line(data[d]));


  const highlightLabels = await Promise.all(highlights.map(async d => (
    window.dataManager.getNameByFips(d))));

  svg.append("g")
    .selectAll(".label")
    .data(highlights)
    .enter()
    .append("text")
      .attr("class", "label")
      .attr("x", d => x(data[d].length - 1) + 10)
      .attr("y", d => y(data[d][data[d].length - 1]) + 5)
      .text((d, i) => highlightLabels[i]);

  svg.selectAll(".highlight")
    .raise();
}

export default async function initLineChart() {
  const data = await window.dataManager.getNewCasesAllStates();

  // TODO: use d3.extent for this
  // Find the maximum number of days with cases over the threshold and maximum
  // number of new cases across all FIPS.
  // Don't update this value as we change selected location
  const { xMax, yMax } = Object.values(data).reduce((chartMax, cases) => {
    if (cases.length > chartMax.xMax) {
      chartMax.xMax = cases.length;
    }
    const maxNewCasesInFips = d3.max(cases);
    if (maxNewCasesInFips > chartMax.yMax) {
      chartMax.yMax = maxNewCasesInFips;
    }
    return chartMax;
  }, { xMax: 0, yMax: 0 });

  // show 10 days beyond the present
  x.domain([0, xMax + 10]);
  y.domain([0, yMax]);

  // Add the X Axis
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  let ticks = [0];
  let displayTicks = [0];
  for (let i = 0; i <= 5; i++) {
    displayTicks.push(10 ** i);
    for (let j = 1; j < 10; j++) {
      ticks.push(j * 10 ** i);
    }
  }
  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y)
        .tickValues(ticks.filter(tick => tick < yMax))
        .tickFormat(i => displayTicks.includes(i) ? i.toLocaleString() : ""));
}
