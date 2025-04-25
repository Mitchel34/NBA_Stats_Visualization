const margin = { top: 20, right: 20, bottom: 30, left: 50 };
const containerWidth = 500;
const containerHeight = 300;
const width = containerWidth - margin.left - margin.right;
const height = containerHeight - margin.top - margin.bottom;

const chartContainer = d3.select('.bar-chart-container');

// === Chart Title ===
chartContainer
  .append('div')
  .style('text-align', 'center')
  .style('font', '20px sans-serif')
  .style('margin-bottom', '10px')
  .text('Monthly Total Points by Team');

// === Create SVG for bar chart ===
const svg = chartContainer
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', `translate(${margin.left}, ${margin.top})`);

// === Tooltip ===
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
  const monthMap = {
    "10": "Oct",
    "11": "Nov",
    "12": "Dec",
    "01": "Jan",
    //"02": "Feb"
  };

  const teams = [...new Set(data.map(d => d.Tm))];
  const months = [...new Set(data.map(d => d.Data.split("-")[1]))]
    .filter(month => month !== "02");

  const aggregatedData = months.map(month => {
    return teams.map(team => {
      const teamMonthData = data.filter(d => d.Tm === team && d.Data.split("-")[1] === month);
      const totalPoints = d3.sum(teamMonthData, d => +d.PTS);
      return {
        team,
        month,
        monthLabel: monthMap[month],
        points: totalPoints
      };
    });
  }).flat();

  const yScale = d3.scaleBand()
    .domain(months.map(m => monthMap[m]))
    .range([0, height])
    .padding(0.2);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(aggregatedData, d => d.points)])
    .range([0, width]);

  svg.append('g').call(d3.axisLeft(yScale));
  svg.append('g').attr('transform', `translate(0, ${height})`).call(d3.axisBottom(xScale));

  window.updateBarChart = updateBarChart;

  function updateBarChart(selectedTeam, color = 'steelblue') {
    const filteredData = aggregatedData.filter(d => d.team === selectedTeam);

    const bars = svg.selectAll('.bar').data(filteredData, d => d.monthLabel);
    bars.exit().remove();

    bars.enter().append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.monthLabel))
      .attr('height', yScale.bandwidth())
      .attr('fill', color)
      .attr('stroke', 'black')
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(`<strong>${d.monthLabel}</strong><br/>Points: ${d.points}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function (event) {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(300).style("opacity", 0);
      })
      .merge(bars)
      .transition()
      .duration(500)
      .attr('width', d => xScale(d.points))
      .attr('fill', color)
      .attr('stroke', 'black');
  }

  updateBarChart(teams[0]);
});

// === Readonly Summary Box Under Chart ===
chartContainer.append('div')
  .style('margin-top', '10px')
  .style('display', 'flex')
  .style('justify-content', 'center')
  .append('div')
  .attr('id', 'barChartNotes')
  .style('width', '500px')
  .style('height', '200px')
  .style('font', '18px sans-serif')
  .style('display', 'flex')
  .style('align-items', 'center')
  .style('justify-content', 'center')
  .style('text-align', 'center')
  .style('background-color', '#f9f9f9')
  .text('With these visualizations, it is seen that Cleveland Cavaliers, Boston Celtics, New York Knicks, and the Denver Nuggets had the most wins per month in the league. With the Denver Nuggets preforming the best, points and wins wise, in the last fully recorded month in the dataset being January');
