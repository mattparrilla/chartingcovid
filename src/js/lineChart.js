import * as d3 from "d3";
import { margin as trendChartMargin } from './trendChart';

// set the dimensions and margins of the graph
const margin = {
  ...trendChartMargin,
  bottom: 120
};
const width = 1000 - margin.left - margin.right;
const height = 700 - margin.top - margin.bottom;
const x = d3.scaleLinear().range([margin.left, width - margin.right]);
const y = d3.scaleSymlog().range([height - margin.bottom, margin.top]);
const svg = d3.select("#js_days_since_chart")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);
const line = d3.line()
  .x((d, i) => x(i))
  // don't show values below 0
  .y((d) => d > 1 ? y(d) : y(0));


function generateHighlights(data) {
  // array of summary statistic objects, for figuring out highlights
  const summaryStatistics = Object.entries(data)
    .map(([fips, newCases]) => ({
      fips,
      maxNewCases: d3.max(newCases),
      daysSince50: newCases.length,
      latestNewCases: newCases[newCases.length - 1]
    }))
    .sort((a, b) => b.maxNewCases > a.maxNewCases ? 1 : -1);

  const fastestRisers = summaryStatistics.sort((a, b) => (
    b.latestNewCases > a.latestNewCases ? 1 : -1
  ));
  const longestDuration = summaryStatistics.sort((a, b) => (
    b.daysSince50 > a.daysSince50 ? 1 : -1
  ));
  const highestPeak = summaryStatistics.sort((a, b) => (
    b.maxNewCases > a.maxNewCases ? 1 : -1
  ));

  const categories = [highestPeak, longestDuration, fastestRisers];
  let i = 0;
  const highlights = [];
  while (highlights.length < 5 && i < 5) {
    categories.forEach(category => {
      if (category[i] && category[i].fips) {
        const fips = category[i].fips;
        if (!highlights.includes(fips)) {
          highlights.push(fips);
        }
      }
    });
    i++;
  }

  // if we have a selected county and if that county has met threshold, include
  // in highlights
  const county = window.locationManager.getCountyFips();
  if (county && county in data && !highlights.includes(county)) {
    highlights.push(county);
  }

  return highlights;
}

function showLabel(d) {
  d3.select(`#js_new_cases_${d}`)
    .style("display", "block");

  // bring line to front
  d3.select(`.line_${d}`)
    .raise();

  d3.select(`.line_${d} .line`)
    .attr("class", "hover line");

  d3.select(`.line_${d} .circle`)
    .attr("class", "hover circle");
}

function hideLabel(d) {
  d3.select(`#js_new_cases_${d}`)
    .style("display", "none");

  d3.select(`.line_${d} .line`)
    .attr("class", "line");

  d3.select(`.line_${d} .circle`)
    .attr("class", "circle");
}

export async function updateLineChart() {
  const data = window.locationManager.isCountryView() ?
    await window.dataManager.getNewCasesAllStates() :
    await window.dataManager.getNewCasesGivenState(window.locationManager.getStateFips());

  const countyFips = window.locationManager.getCountyFips();

  // Remove existing elements
  svg.selectAll(".new_cases_line").remove();
  svg.selectAll(".legend_item").remove();

  const highlights = generateHighlights(data);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  function lineColor(d) {
    const highlightIndex = highlights.indexOf(d);
    return highlightIndex >= 0 ? color(d) : "#aaa";
  }

  // make map between fips and name of location
  const placeLabels = {};
  for (const fips in data) {
    if (data.hasOwnProperty(fips)) {
      placeLabels[fips] = await window.dataManager.getNameByFips(fips);
    }
  }

  const g = svg
    .append("g")
    .attr("class", "line_container");

  const newCasesLine = g.selectAll(".new_cases_line")
    .data(Object.keys(data))
    .enter()
    .append("g")
      .attr("class", d => `new_cases_line line_${d}`);

  newCasesLine
    .append("circle")
      .attr("class", "circle")
      .attr("r", 4)
      .attr("cx", d => x(data[d].length - 1))
      .attr("cy", d => y(data[d][data[d].length - 1]))
      .style("fill", lineColor)
      .on("mouseover", showLabel)
      .on("mouseout", hideLabel);


  newCasesLine
    .append("path")
      .attr("class", "line")
      .attr("d", d => line(data[d]))
      .style("stroke", lineColor)
      .on("mouseover", showLabel)
      .on("mouseout", hideLabel);

  newCasesLine
    .append("text")
      .attr("x", d => x(data[d].length - 1) + 15)
      .attr("y", d => y(data[d][data[d].length - 1]) + 5)
      .attr("id", d => `js_new_cases_${d}`)
      .text(d => placeLabels[d])
      .style("display", (d) => d === countyFips ? "block" : "none");

  const legendItems = svg.select(".legend")
    .selectAll(".legend_item")
    .data(highlights)
    .enter()
      .append("g")
      .attr("class", "legend_item");

  function legendY(i) {
    return margin.top + 10 + (i * 20);
  }

  const legendX = width - 200;
  legendItems
    .append("circle")
      .attr("class", "legend_circle")
      .attr("r", 4)
      .attr("cx", legendX - 15)
      .attr("cy", (d, i) => legendY(i) - 5)
      .style("fill", lineColor);

  legendItems
    .append("text")
      .attr("class", "legend_key")
      .attr("x", legendX)
      .attr("y", (d, i) => legendY(i))
      .text(d => placeLabels[d]);
}

export default async function initLineChart() {
  const data = await window.dataManager.getNewCasesAllStates();

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

  svg.append("g")
    .attr("class", "legend");

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

  // x axis label
  svg.append("text")
    .attr("transform", `translate(${(width / 2)}, ${height - 50})`)
    .style("text-anchor", "middle")
    .text("Days Since 50 Confirmed Cases");
}
