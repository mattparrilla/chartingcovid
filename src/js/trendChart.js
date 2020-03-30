import * as d3 from 'd3';

export default function initTrendChart() {
  const margin = { top: 30, right: 0, bottom: 30, left: 40 };
  const height = 500;
  const width = 1000;

  const data = [
    { date: "2020-02-15", cases: 2 },
    { date: "2020-02-16", cases: 4 },
    { date: "2020-02-17", cases: 8 },
    { date: "2020-02-18", cases: 16 },
  ];

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
      // TODO: format date
      .call(d3.axisBottom(x).tickFormat(i => data[i].date).tickSizeOuter(0));

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

    return svg.node();
}
