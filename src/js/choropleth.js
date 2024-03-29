import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import router from './router';

const maxZoom = 8;
const path = d3.geoPath();
const width = 975;
const height = 610;
const svg = d3.select("#js_map")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);
const g = svg.append("g");
const zoom = d3.zoom()
    .scaleExtent([1, maxZoom])
    .on("zoom", () => {
      const { transform } = d3.event;
      g.attr("transform", transform);
      g.attr("stroke-width", 1 / transform.k);
    });

let active = d3.select(null);
function reset() {
  active = d3.select(null);
  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity,
    d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
  );
  // re-enable pointer events on state boundaries
  svg.selectAll(".js_state_bounds")
      .attr("pointer-events", "visible");
}

function zoomToState(d, node) {
  // disable pointer events while we're zoomed on state
  svg.selectAll(".js_state_bounds")
      .attr("pointer-events", "none");

  active = node;
  const [[x0, y0], [x1, y1]] = path.bounds(d);
  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
  );
}

// We want to separate map clicks from other app-level location updates
async function zoomToStateClick(d) {
  // if user has clicked on same node, zoom out
  if (active.node() === this) {
    reset();
  } else {
    d3.event.stopPropagation();
    const newUrl = await window.dataManager.getUrlForFips(d.id);
    router.navigateTo(newUrl);
  }
}

// handle non-click zooms
function zoomToCounty(d, node) {
  // clear highlighted class from all counties
  svg.selectAll(".map_county")
    .attr("class", "map_county")
    .style("stroke", "white");

  // disable pointer events while we're zoomed on state
  svg.selectAll(".js_state_bounds")
      .attr("pointer-events", "none");

  active = node;
  const [[x0, y0], [x1, y1]] = path.bounds(d);
  node.raise();
  node.attr("class", "map_county highlight_county");
  node.style("stroke", "#1DB954");
  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(Math.min(maxZoom, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
  );
}

// We want to separate map clicks from other app-level location updates
async function zoomToCountyClick(d) {
  // if user has clicked on same node, zoom out
  if (active.node() === this) {
    reset();
  } else {
    d3.event.stopPropagation();
    const newUrl = await window.dataManager.getUrlForFips(d.id);
    router.navigateTo(newUrl);
  }
}

function countyMouseOver() {
  const county = d3.select(this);
  // don't change outline of this is our selected county
  if (!county.attr("class").includes("highlight_county")) {
    county.style("stroke", "#1DB954");
    county.raise();
  }
}

async function countyMouseOut() {
  const county = d3.select(this);
  // update county outline if this isn't our selected county
  if (!county.attr("class").includes("highlight_county")) {
    county.style("stroke", "white");
    svg.select(".highlight_county")
      .raise();
  }
}

function calculateExtent(data) {
  return d3.extent((Object.values(data)).filter(d => d.per_capita).map(d => Math.log(d.per_capita)));
}

async function drawLegend() {
  const mostRecentData = await window.dataManager.getMostRecentData();
  const extent = calculateExtent(mostRecentData);
  const ticks = 9;
  const color = d3.scaleQuantize(extent, d3.schemeOranges[ticks]);

  const legendWidth = 125;
  const legendHeight = 220;
  const legendMargin = 10; // top, bottom, left, right

  const thresholds = color.thresholds();
  const thresholdFormat = d => d3.format(",.03%")(Math.exp(d));
  const tickSize = 20;

  const x = d3.scaleLinear()
    .domain([-1, color.range().length - 1])
    .rangeRound([0, ticks * tickSize]);

  const legend = svg.append("g")
    .attr("id", "js_map_legend")
    .attr("height", legendHeight)
    .attr("width", legendWidth)
    .attr("transform", `translate(${width - legendWidth - legendMargin}, ${height - legendMargin - legendHeight})`);

  legend.append("rect")
    .attr("height", legendHeight)
    .attr("width", legendWidth);

  legend.append("g")
    .selectAll("rect")
    .data(color.range())
    .join("rect")
      .attr("x", legendWidth - tickSize - legendMargin)
      .attr("y", (d, i) => x(i - 1) + legendMargin + 20) // 30 for legend title
      .attr("width", tickSize)
      .attr("height", tickSize)
      .style("stroke", "#fff")
      .style("fill", d => d);

  const tickValues = d3.range(thresholds.length);
  const tickFormat = i => thresholdFormat(thresholds[i], i);

  legend.append("g")
    .attr("transform", `translate(${legendWidth - legendMargin - tickSize},${legendMargin + 20})`)
    .call(d3.axisLeft(x)
      .ticks(ticks)
      .tickFormat(tickFormat)
      .tickSize(0)
      .tickValues(tickValues))
      .call(el => el.select(".domain").remove())
      .call(el => el.append("text")
        .attr("x", 25)
        .attr("y", -10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "begin")
        .attr("font-weight", "bold")
        .text("Cases Per Capita"));
}

function mergeNYCCounties(countyOutline) {
  const NYCCounties = ["36085", "36081", "36061", "36047", "36005"];
  const newYorkCity = topojson.mergeArcs(countyOutline,
    countyOutline.objects.counties.geometries.filter(d => NYCCounties.includes(d.id)));
  newYorkCity.id = "-10003";
  countyOutline.objects.counties.geometries.push(newYorkCity);

  // Remove NYC counties from county geometries
  countyOutline.objects.counties.geometries.filter(d => !NYCCounties.includes(d.id));

  return topojson.feature(countyOutline, countyOutline.objects.counties).features;
}

function drawMap(countyOutline) {
  svg.on("click", reset);

  // enable zoom and pan with mouse in SVG element if not a touch screen
  if (!("ontouchstart" in window)) {
    svg.call(zoom);
  }

  const counties = mergeNYCCounties(countyOutline);

  // Draw counties
  g.append("g")
    .selectAll("path")
    .data(counties)
    .join("path")
      .attr("class", "map_county")
      .on("mouseover", countyMouseOver)
      .on("mouseout", countyMouseOut)
      .on("click", zoomToCountyClick)
      .attr("id", d => `js_fips_${d.id}`)
      .attr("d", path)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .attr("fill", "white");

  // Add invisible states
  g.append("g")
      .attr("fill", "none")
      .attr("cursor", "pointer")
    .selectAll("path")
    .data(topojson.feature(countyOutline, countyOutline.objects.states).features)
    .join("path")
      .attr("class", "js_state_bounds")
      .attr("pointer-events", "visible")
      .attr("id", d => `js_fips_${d.id}`)
      .on("click", zoomToStateClick)
      .attr("d", path);

  // Draw state borders
  g.append("path")
    .datum(topojson.mesh(
      countyOutline, countyOutline.objects.states, (a, b) => a !== b
    ))
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("stroke-linejoin", "round")
    .attr("d", path);

  // add date label in map element
  svg.append("text")
    .attr("id", "js_on_map_date_label")
    .attr("x", "50%")
    .attr("y", 30)
    .style("text-anchor", "middle")
    .text("");
}

async function updateMap(daysPrior = 0) {
  const caseData = await window.dataManager.getDaysPriorData(daysPrior);
  const mostRecentData = await window.dataManager.getMostRecentData();
  const extent = calculateExtent(mostRecentData);
  const palette = d3.schemeOranges[9];
  const color = d3.scaleQuantize(extent, palette);

  svg.selectAll(".map_county")
    .style("fill", d => {
      if (caseData[d.id] && caseData[d.id].per_capita) {
        return color(Math.log(caseData[d.id].per_capita));
      }
      return palette[0];
    });
}

async function updateSliderLabel(slider, daysPrior = 0) {
  const dates = await window.dataManager.getDates();
  // I can't figure out how to get the date string output to not automatically
  // use my local timezone to alter the output. So let's add 12 hours. Sigh.
  const date = new Date(dates[daysPrior] + " 12:00");
  const label = document.getElementById("js_slider_label");

  const min = slider.min;
  const max = slider.max;
  // Calculates the percent through the slider we are right now.
  const baseOffset = Number(((daysPrior - min) * 100) / (max - min));
  // To center the text we slide it a bit right, and the further left it goes,
  // the more so. This is a hack obviously.
  const offset = baseOffset - (baseOffset * 0.07) - 1;

  label.style.right = offset + "%";
  const dateOptions = {month: 'long', day: 'numeric'};
  const formattedDate =
    new Intl.DateTimeFormat('un-US', dateOptions).format(date);
  const dateString = formattedDate.toString();
  label.innerHTML = dateString;

  svg.select("#js_on_map_date_label")
    .text(dateString);
}

async function initSlider() {
  const dates = await window.dataManager.getDates();
  const slider = document.getElementById("js_map_slider");

  // Restrict slider to March 1 (when cases really started to grow) and beyond
  const datesSinceFeb15 = dates.slice(0, dates.findIndex(date => date === "2020-03-01") + 1);
  slider.max = datesSinceFeb15.length - 1;
  slider.value = datesSinceFeb15.length - 1;

  slider.addEventListener("input", (e) => {
    const daysPrior = datesSinceFeb15.length - 1 - parseInt(e.target.value, 10);
    updateMap(daysPrior);
    updateSliderLabel(slider, daysPrior);
  });
}

export async function updateMapZoom() {
  const stateFips = window.locationManager.getStateFips();
  const countyFips = window.locationManager.getCountyFips();

  if (countyFips) {
    const countyOutline = await window.dataManager.getCountyOutline();
    const counties = topojson.feature(countyOutline, countyOutline.objects.counties).features;
    const selectedFeature = counties.find(({ id }) => id === countyFips);
    const selectedNode = d3.select(`#js_fips_${countyFips}`);
    zoomToCounty(selectedFeature, selectedNode);
  } else if (stateFips) {
    const countyOutline = await window.dataManager.getCountyOutline();
    const states = topojson.feature(countyOutline, countyOutline.objects.states).features;
    const selectedFeature = states.find(({ id }) => id === stateFips);
    const selectedNode = d3.select(`#js_fips_${stateFips}`);
    zoomToState(selectedFeature, selectedNode);
  } else {
    reset();
  }
}

async function animateMap(interval = 100) {
  const slider = document.getElementById("js_map_slider");
  slider.value = 0;
  const max = parseInt(slider.max, 10);
  const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  for (let i = 0; i <= slider.max; i++) {
    await sleep(interval);
    updateSliderLabel(slider, max - i);
    updateMap(max - i);
  }
}

export default async function initChoropleth() {
  const slider = document.getElementById("js_map_slider");
  const countyOutline = await window.dataManager.getCountyOutline();

  window.animateMap = animateMap;

  initSlider();
  drawLegend();
  drawMap(countyOutline);
  updateMap();
  updateSliderLabel(slider);
}
