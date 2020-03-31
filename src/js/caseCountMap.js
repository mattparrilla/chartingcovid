import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { fetchData, filterOutStates } from './utilities';

var svg;

function drawMap() {
  svg = d3.select("#js_map")
    .append("svg")
    .attr("viewBox", [0, 0, 975, 610]);
}

function updateMap(countyData, states, caseData, color) {
    const path = d3.geoPath();

    svg.append("g")
      .selectAll("path")
      .data(topojson.feature(countyData, countyData.objects.counties).features)
      .join("path")
        .attr("fill", d => color(caseData[d.id] ? Math.log(caseData[d.id].cases) : 0))
        .attr("d", path);

    svg.append("path")
        .datum(topojson.mesh(
          countyData, countyData.objects.states, (a, b) => a !== b))
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .attr("d", path);
}

function removeStates(caseData, fipsData) {
  const keys = Object.keys(caseData);
  keys.forEach(function(key) {
    if (fipsData[key] == null || fipsData[key].county.length == 0) {
      delete caseData[key];
    }
  });
}

function perCapita(caseData, fipsData) {
  const keys = Object.keys(caseData);
  keys.forEach(function(key) {
    const population = fipsData[key] && fipsData[key].population;
    caseData[key].cases = caseData[key].cases / population;
  });
  return caseData;
}

export default async function initCaseCountMap(data) {
  drawMap();

  const fipsData = await data.fips;
  const casesByDate = await data.cases;
  const countyOutline = await data.countyOutline;
  const states = new Map(countyOutline.objects.states.geometries.map(
    d => [d.id, d.properties]));
  const mostRecentData = casesByDate["2020-03-27"];
  removeStates(mostRecentData, fipsData);
  const perCapitaCountyData = perCapita(mostRecentData, fipsData);
  const extent =
    d3.extent((Object.values(mostRecentData)).map(c => Math.log(c.cases)));
  const color = d3.scaleQuantize(extent, d3.schemeOranges[9]);

  updateMap(countyOutline, states, mostRecentData, color);
}
