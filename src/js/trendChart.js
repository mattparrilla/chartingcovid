import * as d3 from 'd3';

const margin = { top: 30, right: 90, bottom: 30, left: 20 };
const height = 500;
const width = 1000;
const yRange = [height - margin.bottom, margin.top];

// Munge the chart data we care about
async function getTrendChartData() {
  const dates = (await window.dataManager.getDates()).reverse();
  const numDays = 30;
  const sliceAt = Math.max(dates.length - numDays, 1);

  // if no fips, we want whole country
  if (window.locationManager.isCountryView()) {
    const states = await window.dataManager.getAllStates();

    const countryPopulation = await states.reduce(async (totalPopulation, { fips }) => {
      const populationSum = await totalPopulation;
      const statePopulation = await window.dataManager.getPopulation(fips);
      return populationSum + statePopulation;
    }, Promise.resolve(0));

    // for each date, sum each states casese
    return Promise.all(dates.map(async date => {
      const cases = await states.reduce(async (countryCases, { fips: stateFips }) => {
        const casesSum = await countryCases;
        const stateCases = await window.dataManager.getCasesGivenDateFips(date, stateFips);
        return casesSum + (stateCases || 0);
      }, Promise.resolve(0));
      return Promise.resolve({
        date,
        cases,
        casesPerCapita: cases / countryPopulation
      });
    }).slice(sliceAt));
  }

  // Get data by FIPS
  const fips = await window.locationManager.getCountyFips()
    || await window.locationManager.getStateFips();
  return Promise.all(dates.map(async date => {
    const cases = await window.dataManager.getCasesGivenDateFips(date, fips) || 0;
    const population = await window.dataManager.getPopulation(fips);
    return Promise.resolve({
      date,
      cases,
      cases_per_capita: cases / population
    });
  }).slice(sliceAt));
}

// given our chart's data generate an X scale
function getChartX(data) {
  return d3.scaleBand()
    .domain(d3.range(data.length))
    .range([margin.left, width - margin.right])
    .padding(0.1);
}

export async function updateTrendChart() {
  const data = await getTrendChartData();
  const svg = d3.select("#js_trend_chart svg");
  const { metric, scale } = document
    .querySelectorAll("#js_chart_metric_selector .active")[0].dataset;

  const x = getChartX(data);
  const yMax = d3.max(data, d => d[metric]);
  const y = (scale === "log" ? d3.scaleSymlog() : d3.scaleLinear())
    .domain([d3.min(data, d => d[metric]), yMax]).nice()
    .range(yRange);

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
      .call(d3.axisRight(y)
        .tickValues(ticks.filter(tick => tick < yMax))
        .tickFormat(i => displayTicks.includes(i) ? i.toLocaleString() : ""));
  } else {
    svg.select(".y.axis")
      .call(d3.axisRight(y));
  }

  // update bars
  svg.selectAll("rect")
    .data(data)
    .transition()
    .duration(1000)
    .attr("x", (d, i) => x(i))
    .attr("y", d => y(d[metric]))
    .attr("height", d => y(0) - y(d[metric]))
    .attr("width", x.bandwidth());
}

export default async function initTrendChart() {
  const chartData = await getTrendChartData();

  const x = getChartX(chartData);
  const y = d3.scaleLinear()
      .domain([d3.min(chartData, d => d.cases), d3.max(chartData, d => d.cases)]).nice()
      .range(yRange);

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
    .call(d3.axisRight(y));

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

  const chartTitleMap = {
    cases: "Confirmed Cases",
    cases_per_capita: "Confirmed Cases Per Capita",
    growth_factor: "Growth Factor",
  };

  // Update chart scale on selection
  const metrics = document.querySelectorAll("#js_chart_metric_selector span");
  metrics.forEach(metric => {
    metric.addEventListener("click", () => {
      metrics.forEach(el => el.classList.remove("active"));
      metric.classList.add("active");

      document.getElementById("js_chart_metric").innerHTML = chartTitleMap[metric.dataset.metric];
      updateTrendChart();
    });
  });
}
