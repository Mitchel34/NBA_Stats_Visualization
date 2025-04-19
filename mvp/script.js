// MVP page specific JavaScript
d3.csv("../data/database_24_25.csv").then(function(data) {
    createScatterPlot(data);
});
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('MVP Page Loaded');
//     // MVP visualization code will go here
    
//     // Initialize any MVP page specific functionality
//     initMVPPage();
// });

// function initMVPPage() {
//     // Add your MVP page initialization code here
//     // This is a placeholder for future development
// }

function createScatterPlot(data) {
    const width = 700;
    const height = 450;
    const margin = { top: 20, right: 120, bottom: 50, left: 60 };

    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse values
    data.forEach(d => {
        d.MP = +d.MP;
        d.PTS = +d.PTS;
    });

    // Create a color scale for teams
    const teams = Array.from(new Set(data.map(d => d.Tm))); // Get unique team names
    const colorScale = d3.scaleOrdinal()
        .domain(teams)
        .range(d3.schemeTableau10.concat(d3.schemeSet3)); // Use a large enough color range

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.MP)])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.PTS)])
        .range([height, 0]);

    // Plot circles with color by team
    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.MP))
        .attr("cy", d => yScale(d.PTS))
        .attr("r", 5)
        .style("fill", d => colorScale(d.Tm))
        .style("opacity", 0.8);

    // X Axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .text("Average Minutes Played per Game (MP)");

    // Y Axis
    svg.append("g")
        .call(d3.axisLeft(yScale))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .text("Average Points per Game (PTS)");

    // Add Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 20)`);

    const legendItems = legend.selectAll(".legend")
        .data(teams)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItems.append("circle")
        .attr("r", 6)
        .attr("cx", 0)
        .attr("cy", 0)
        .style("fill", d => colorScale(d));

    legendItems.append("text")
        .attr("x", 15)
        .attr("y", 5)
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .text(d => d);
}

