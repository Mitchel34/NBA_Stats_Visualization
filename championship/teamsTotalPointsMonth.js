const margin = { top: 20, right: 20, bottom: 30, left: 50 };
// const width = 500 - margin.left - margin.right;
// const height = 300 - margin.top - margin.bottom;
const containerWidth = 500;
const containerHeight = 300;
const width = containerWidth - margin.left - margin.right;
const height = containerHeight - margin.top - margin.bottom;


const svg = d3.select('.bar-chart-container')//('body')
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', `translate(${margin.left}, ${margin.top})`);

// Define pastel blue gradient
const defs = svg.append("defs");
const gradient = defs.append("linearGradient")
  .attr("id", "pastelBlueGradient")
  .attr("x1", "0%").attr("x2", "100%")
  .attr("y1", "0%").attr("y2", "0%");
gradient.append("stop").attr("offset", "0%").attr("stop-color", "#a3c9f9");
gradient.append("stop").attr("offset", "100%").attr("stop-color", "#d6e9ff");

// Tooltip setup
const tooltip = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("background", "#f9f9f9")
  .style("padding", "5px 10px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "5px")
  .style("pointer-events", "none")
  .style("opacity", 0)
  .style("font", "12px sans-serif");

d3.csv('../data/database_24_25.csv').then(data => {
  const teams = [...new Set(data.map(d => d.Tm))];
  const months = [...new Set(data.map(d => d.Data.split("-")[1]))];

  const aggregatedData = months.map(month => {
    return teams.map(team => {
      const teamMonthData = data.filter(d => d.Tm === team && d.Data.split("-")[1] === month);
      const totalPoints = d3.sum(teamMonthData, d => +d.PTS);
      return { team, month, points: totalPoints };
    });
  }).flat();

  const yScale = d3.scaleBand()
    .domain(months)
    .range([0, height])
    .padding(0.2);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(aggregatedData, d => d.points)])
    .range([0, width]);

  svg.append('g')
  //.attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale));

  svg.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  function updateChart(selectedTeam) {
    const filteredData = aggregatedData.filter(d => d.team === selectedTeam);

    const bars = svg.selectAll('.bar')
      .data(filteredData, d => d.month);

    bars.exit().remove();

    const barEnter = bars.enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.month))
      .attr('height', yScale.bandwidth())
      .attr('fill', 'url(#pastelBlueGradient)')
      .attr('stroke', 'black') // Border color
      .attr('stroke-width', 1) // Border width
      .on('mouseover', (event, d) => {
        tooltip.transition().duration(150).style('opacity', 1);
        tooltip.html(`<strong>${d.month}</strong><br/>Points: ${d.points}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mousemove', event => {
        tooltip.style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition().duration(200).style('opacity', 0);
      });

    barEnter.merge(bars)
      .transition()
      .duration(500)
      .attr('width', d => xScale(d.points))
      .attr('y', d => yScale(d.month));
  }

  // const filterSelect = d3.select('.bar-chart-container')//('body')
  //   .append('select')
  const filterSelect = d3.select("#teamFilter")
    .on('change', function () {
      const selectedTeam = d3.select(this).property('value');
      updateChart(selectedTeam);
    });

  filterSelect.selectAll('option')
    .data(teams)
    .enter()
    .append('option')
    .text(d => d)
    .property('value', d => d);

  updateChart(teams[0]);
});
