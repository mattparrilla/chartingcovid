import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const path = d3.geoPath();
const width = 975;
const height = 610;
const svg = d3.select("#js_map")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);

function drawMap(countyOutline) {
  // Draw counties
  svg.append("g")
    .selectAll("path")
    .data(topojson.feature(countyOutline, countyOutline.objects.counties).features)
    .join("path")
      .attr("class", "map_county")
      .attr("d", path)
      .attr("fill", "white");

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

async function updateMap(daysPrior = 0) {
  const caseData = await window.dataManager.getDaysPriorData(daysPrior);
  const mostRecentData = await window.dataManager.getMostRecentData();
  const extent =
    d3.extent((Object.values(mostRecentData)).map(c => Math.log(c.cases)));
  const color = d3.scaleQuantize(extent, d3.schemeOranges[9]);

  svg.selectAll(".map_county")
    .transition()
    .delay(300)
    .duration(500)
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

export default async function initCaseCountMap() {
  const countyOutline = await window.dataManager.getCountyOutline();

  initSlider();
  drawMap(countyOutline);
  updateMap();
}
