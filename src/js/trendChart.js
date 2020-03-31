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

function updateChart({ data, svg, x, y }) {
  const { metric, scale } = document
    .querySelectorAll("#js_chart_metric_selector .active")[0].dataset;

  x.domain(d3.range(data.length));
  const yMax = d3.max(data, d => d[metric]);
  y.domain([d3.min(data, d => d[metric]), yMax]).nice();

  const updatedY = (scale === "log" ? d3.scaleSymlog() : d3.scaleLinear())
    .domain(y.domain())
    .range(y.range());

  if (scale === "log") {
    // build list of logarithmic ticks (1,2,3....10, 20, 30,..100, 200, 300...)
    let ticks = [0];
    let displayTicks = [0];
    for (let i = 0; i <= 5; i++) {
      displayTicks.push(10 ** i);
      for (let j = 1; j < 10; j++) {
        ticks.push(j * 10 ** i);
      }
    }
    svg.select(".y.axis")
      .call(d3.axisRight(updatedY)
        .tickValues(ticks.filter(tick => tick < yMax))
        .tickFormat(i => displayTicks.includes(i) ? i.toLocaleString() : ""));
  } else {
    svg.select(".y.axis")
      .call(d3.axisRight(updatedY));
  }

  // update bars
  svg.selectAll("rect")
    .data(data)
    .transition()
    .duration(1000)
    .attr("x", (d, i) => x(i))
    .attr("y", d => updatedY(d[metric]))
    .attr("height", d => updatedY(0) - updatedY(d[metric]))
    .attr("width", x.bandwidth());
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
      .domain([d3.min(chartData, d => d.cases), d3.max(chartData, d => d.cases)]).nice()
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
    .attr("class", "y axis")
    .attr("transform", `translate(${width - margin.right},0)`)
    .call(d3.axisRight(y))
    .append("text")
      .attr("x", -margin.left)
      .attr("y", 10)
      .attr("fill", "currentColor")
      .attr("text-anchor", "start")
      .text(chartData.y);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("class", "x axis")
    .call(d3.axisBottom(x)
      .tickSizeOuter(0)
      .tickFormat(i => d3.timeFormat("%b %d")(d3.timeParse("%Y-%m-%d")(chartData[i].date))));

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

  const chart = {
    data: chartData,
    svg,
    x,
    y,
  };

  // Update chart scale on selection
  const scales = document.querySelectorAll("#js_chart_scale_selector span");
  scales.forEach(scale => {
    scale.addEventListener("click", () => {
      scales.forEach(el => el.classList.remove("active"));
      scale.classList.add("active");
      updateChart(chart);
    });
  });

  // Update chart scale on selection
  const metrics = document.querySelectorAll("#js_chart_metric_selector span");
  metrics.forEach(metric => {
    metric.addEventListener("click", () => {
      metrics.forEach(el => el.classList.remove("active"));
      metric.classList.add("active");
      updateChart(chart);
    });
  });
}
