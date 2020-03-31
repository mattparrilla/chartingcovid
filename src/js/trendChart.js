import * as d3 from 'd3';
import { sortDateString, filterOutCounties } from './utilities';

export async function getTrendChartData({ data, fips, numDays = 30 }) {
  const fipsData = await data.fips;
  const casesByDate = await data.cases;
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

  // Get data by FIPS
  const trendData = dates.map(date => ({
    date,
    cases: (casesByDate[date] && casesByDate[date][fips] && casesByDate[date][fips].cases) || 0
  }));
  return trendData.slice(Math.max(trendData.length - numDays, 1));
}

export default async function initTrendChart(data, fips) {
  const margin = { top: 30, right: 90, bottom: 30, left: 20 };
  const height = 500;
  const width = 1000;

  const chartData = await getTrendChartData({ data, fips });

  const x = d3.scaleBand()
    .domain(d3.range(chartData.length))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.cases)]).nice()
      .range([height - margin.bottom, margin.top]);

  const svg = d3.select("#js_trend_chart")
    .append("svg")
    .attr("viewBox", [0, 0, width, height]);

  svg.append("g")
      .attr("fill", "steelblue")
    .selectAll("rect")
    .data(chartData)
    .join("rect")
      .attr("x", (d, i) => x(i))
      .attr("y", d => y(d.cases))
      .attr("height", d => y(0) - y(d.cases))
      .attr("width", x.bandwidth());

  svg.append("g")
    .attr("transform", `translate(${width - margin.right},0)`)
    .call(d3.axisRight(y))
    .call(d => d.select(".domain").remove())
    .call(d => d.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(chartData.y));

  // X Axis
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("class", "x_axis")
    .call(d3.axisBottom(x)
      .tickSizeOuter(0)
      .tickFormat(i => d3.timeFormat("%b %d")(d3.timeParse("%Y-%m-%d")(chartData[i].date))));

  // Deciding which ticks to display on the bar chart...
  // starting from the most recent date, show every 5 ticks but also show the
  // oldest tick provided it is not within 2 ticks of the nearest every-5 tick
  d3.selectAll(".x_axis .tick").style("display", (d, i) => {
    const reverseIdx = chartData.length - 1 - i;
    if (i === 0 && reverseIdx % 5 > 2) {
      return "initial";
    }
    return reverseIdx % 5 ? "none" : "initial";
  });
}
