import * as d3 from 'd3';
import { fetchData, sortDateString, filterOutCounties } from './utilities';

export async function getTrendChartData(fips) {
  const [fipsData, casesByDate, countyData] = await fetchData();
  const dates = sortDateString(casesByDate);

  // if no fips, we want whole country
  if (fips == null) {
    const stateData = filterOutCounties(fipsData);
    return dates.map(date => ({
      date,
      cases: stateData.reduce((countryCases, state) => {
        const stateCases = casesByDate
          && casesByDate[date][state.fips]
          && casesByDate[date][state.fips].cases;
        return countryCases + (stateCases || 0);
      }, 0)
    }));
  }
  return [];
}
export default async function initTrendChart() {
  const margin = { top: 30, right: 40, bottom: 30, left: 70 };
  const height = 500;
  const width = 1000;

  const data = await getTrendChartData();

  const x = d3.scaleBand()
    .domain(d3.range(data.length))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.cases)]).nice()
      .range([height - margin.bottom, margin.top]);

  const yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .call(d => d.select(".domain").remove())
    .call(d => d.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y));

  const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("class", "x_axis")
    .call(d3.axisBottom(x)
      .tickSizeOuter(0)
      .tickFormat(i => d3.timeFormat("%b %d")(d3.timeParse("%Y-%m-%d")(data[i].date))));

  const svg = d3.select("#js_trend_chart")
    .append("svg")
    .attr("viewBox", [0, 0, width, height]);

  svg.append("g")
      .attr("fill", "steelblue")
    .selectAll("rect")
    .data(data)
    .join("rect")
      .attr("x", (d, i) => x(i))
      .attr("y", d => y(d.cases))
      .attr("height", d => y(0) - y(d.cases))
      .attr("width", x.bandwidth());

  svg.append("g")
      .call(xAxis);

  svg.append("g")
      .call(yAxis);

  // only show every 5 ticks, including the latest
  d3.selectAll(".x_axis .tick").style("display", (d, i) => {
    const reverseIdx = data.length - 1 - i;
    return reverseIdx % 5 ? "none" : "initial";
  });
}
