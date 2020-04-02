import * as d3 from 'd3';
import * as topojson from 'topojson-client';

let svg;

function drawMap(countyOutline) {
  svg = d3.select("#js_map")
    .append("svg")
    .attr("viewBox", [0, 0, 975, 610]);

  const path = d3.geoPath();

  // Draw counties
  svg.append("g")
    .selectAll("path")
    .data(topojson.feature(countyOutline, countyOutline.objects.counties).features)
    .join("path")
      .attr("class", "map_county")
      .attr("d", path);

  // Draw state borders
  svg.append("path")
      .datum(topojson.mesh(
        countyOutline, countyOutline.objects.states, (a, b) => a !== b
      ))
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("stroke-linejoin", "round")
      .attr("d", path);
}

async function updateMap() {
  const caseData = await window.dataManager.getMostRecentData();
  const extent =
    d3.extent((Object.values(caseData)).map(c => Math.log(c.cases)));
  const color = d3.scaleQuantize(extent, d3.schemeOranges[9]);

  svg.selectAll(".map_county")
    .attr("fill", d => color(caseData[d.id] ? Math.log(caseData[d.id].cases) : 0));
}

function removeStates(today) {
  const keys = Object.keys(today);
  keys.forEach(async (key) => {
    const entry = await window.dataManager.getFipsEntry(key);
    if (entry == null || entry.county.length === 0) {
      delete today[key];
    }
  });
}

export default async function initCaseCountMap() {
  const countyOutline = await window.dataManager.getCountyOutline();

  drawMap(countyOutline);
  updateMap();
}
