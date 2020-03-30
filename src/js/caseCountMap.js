import * as d3 from 'd3';
import topojson from 'topojson';

export default async function initCaseCountMap() {
  map = {
    const viewportWidth = Math.max(
      document.documentElement.clientWidth, window.innerWidth || 0);
    const mapWidth = viewportWidth * 0.9;
    const mapHeight = mapWidth * 0.625;

    const svg = d3.create("svg")
        .attr("viewBox", [0, 0, mapWidth, mapHeight]);

    // svg.append("g")
    //     .attr("transform", "translate(610,20)")
    //     .append(() => legend({color, title: data.title, width: 260}));

    svg.append("g")
      .selectAll("path")
      .data(topojson.feature(us, us.objects.counties).features)
      .join("path")
        .attr("fill", function(d) {
          color(data.get(d.id));
        })
        .attr("d", path)
      .append("title")
        .text(d => `${d.properties.name}, ${states.get(d.id.slice(0, 2)).name}
  ${format(data.get(d.id))}`);

    svg.append("path")
        .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .attr("d", path);

    return svg.node();
  }

  const [fipsData, casesByDate, countyData] = await fetchData(
    "/data/fips_data.json",
    "/data/covid_cases_by_date.json",
    "/data/counties-albers-10m.json",
  );
  states = new Map(countyData.objects.states.geometries.map(
    d => [d.id, d.properties]))
  path = d3.geoPath();
  color = d3.scaleQuantize([1, 10], d3.schemeOranges[9])
}
