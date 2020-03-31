import * as d3 from 'd3';
import { sortDateString, filterOutCounties } from './utilities';

export async function getTrendChartData({ dataPromise, fips, numDays = 30 }) {
  const fipsData = await dataPromise.fips;
  const casesByDate = await dataPromise.cases;
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
  const trendData = dates.map(date => {
    const cases = (
      casesByDate[date] && casesByDate[date][fips] && casesByDate[date][fips].cases
    ) || 0;
    return {
      date,
      cases,
      cases_per_capita: cases / fipsData[fips].population,
    };
  });
  return trendData.slice(Math.max(trendData.length - numDays, 1));
}

function updateChart({ data, svg, x, y, metric }) {
  x.domain(d3.range(data.length));
  y.domain([d3.min(data, d => d[metric]), d3.max(data, d => d[metric])]).nice();

  svg.select(".y.axis")
    .transition()
    .duration(1000)
    .call(d3.axisRight(y));

  const bars = svg.selectAll("rect")
    .data(data);

  bars
    .transition()
    .duration(1000)
    .attr("x", (d, i) => x(i))
    .attr("y", d => y(d[metric]))
    .attr("height", d => y(0) - y(d[metric]))
    .attr("width", x.bandwidth());

  // bars.enter().append("rect")
  //   .attr("x", (d, i) => x(i))
  //   .attr("y", d => y(d[metric]))
  //   .attr("height", d => y(0) - y(d[metric]))
  //   .attr("width", x.bandwidth());

  // bars.exit()
  //   .transition()
  //     .duration(500)
  //     .attr("height", 0)
  //     .remove();
}

export default async function initTrendChart(dataPromise, fips) {
  const margin = { top: 30, right: 90, bottom: 30, left: 20 };
  const height = 500;
  const width = 1000;

  const chartData = await getTrendChartData({ dataPromise, fips });

  const x = d3.scaleBand()
    .domain(d3.range(chartData.length))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.cases)]).nice()
      .range([height - margin.bottom, margin.top]);

  // TODO: implement scale
  // const yLog = d3.scaleSymlog()
  //     .domain([0, d3.max(chartData, d => d.cases)]).nice()
  //     .range([height - margin.bottom, margin.top]);

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

  // const yAxis = yScale => g => g
  //   .attr("class", "y axis")
  //   .attr("transform", `translate(${width - margin.right},0)`)
  //   .call(d3.axisRight(y))
  //   .call(d => d.append("text")
  //   });

  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${width - margin.right},0)`)
    .call(d3.axisRight(y))
    .append("text")
      .attr("x", -margin.left)
      .attr("y", 10)
      .attr("fill", "currentColor")
      .attr("text-anchor", "start")
      .text(chartData.y);

  const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("class", "x axis")
    .call(d3.axisBottom(x)
      .tickSizeOuter(0)
      .tickFormat(i => d3.timeFormat("%b %d")(d3.timeParse("%Y-%m-%d")(chartData[i].date))));

  // svg.append("g")
  //   .call(yAxis(y, chartData));

  svg.append("g")
    .call(xAxis);

  // Deciding which ticks to display on the bar chart...
  // starting from the most recent date, show every 5 ticks but also show the
  // oldest tick provided it is not within 2 ticks of the nearest every-5 tick
  d3.selectAll(".x.axis .tick").style("display", (d, i) => {
    const reverseIdx = chartData.length - 1 - i;
    if (i === 0 && reverseIdx % 5 > 2) {
      return "initial";
    }
    return reverseIdx % 5 ? "none" : "initial";
  });

  // Update chart scale on selection
  const scales = document.querySelectorAll("#js_chart_scale_selector span");
  scales.forEach(scale => {
    scale.addEventListener("click", () => {
      scales.forEach(el => el.classList.remove("active"));
      scale.classList.add("active");
      // TODO: update scale
    });
  });

  // Update chart scale on selection
  const metrics = document.querySelectorAll("#js_chart_metric_selector span");
  metrics.forEach(metric => {
    metric.addEventListener("click", () => {
      metrics.forEach(el => el.classList.remove("active"));
      metric.classList.add("active");
      updateChart({ data: chartData, svg, x, y, metric: metric.dataset.metric });
    });
  });
}
