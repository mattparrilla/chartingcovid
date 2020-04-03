import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const path = d3.geoPath();
const width = 975;
const height = 610;
const svg = d3.select("#js_map")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);
const g = svg.append("g");
const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", () => {
      const { transform } = d3.event;
      g.attr("transform", transform);
      g.attr("stroke-width", 1 / transform.k);
    });
let active = d3.select(null);


function reset() {
  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity,
    d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
  );
}

// We want to separate map clicks from other app-level location updates
function zoomToStateClick(d) {
  // if user has clicked on same node, zoom out
  if (active.node() === this) {
    reset();
  } else {
    active = d3.select(this);
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    d3.event.stopPropagation();
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
      d3.mouse(svg.node())
    );
  }
}

function zoomToState(d) {
  active = d3.select(this);
  const [[x0, y0], [x1, y1]] = path.bounds(d);
  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
  );
}


function drawMap(countyOutline) {
  svg.on("click", reset);

  // enable zoom and pan with mouse in SVG element
  svg.call(zoom);

  // Draw counties
  g.append("g")
    .selectAll("path")
    .data(topojson.feature(countyOutline, countyOutline.objects.counties).features)
    .join("path")
      .attr("class", "map_county")
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
      .attr("pointer-events", "visible")
      .attr("id", d => `fips_${d.id}`)
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
}

async function updateMap(daysPrior = 0) {
  const caseData = await window.dataManager.getDaysPriorData(daysPrior);
  const mostRecentData = await window.dataManager.getMostRecentData();
  const extent =
    d3.extent((Object.values(mostRecentData)).map(c => Math.log(c.cases)));
  const color = d3.scaleQuantize(extent, d3.schemeOranges[9]);

  svg.selectAll(".map_county")
    .attr("fill", d => color(caseData[d.id] ? Math.log(caseData[d.id].cases) : 0));
}

async function initSlider() {
  const dates = await window.dataManager.getDates();
  const slider = document.getElementById("js_map_slider");
  slider.max = dates.length - 1;
  slider.value = dates.length - 1;

  slider.addEventListener("input", (e) => {
    const daysPrior = dates.length - 1 - parseInt(e.target.value, 10);
    updateMap(daysPrior);
  });
}

export async function updateMapZoom() {
  const stateFips = window.locationManager.getStateFips();

  if (stateFips) {
    const countyOutline = await window.dataManager.getCountyOutline();
    const states = topojson.feature(countyOutline, countyOutline.objects.states).features;
    const selected = states.find(({ id }) => id === stateFips);
    zoomToState(selected);
  } else {
    reset();
  }
}

export default async function initCaseCountMap() {
  const countyOutline = await window.dataManager.getCountyOutline();
  window.d3 = d3;

  initSlider();
  drawMap(countyOutline);
  updateMap();
}
