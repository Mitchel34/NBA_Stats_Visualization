document.addEventListener("DOMContentLoaded", function () 
{
    d3.csv("../data/database_24_25.csv").then(data => {
        const teamMonthData = {};
        const countedGames = new Set(); 

        data.forEach(row => {
            const team = row.Tm;
            const result = row.Res;
            const date = row.Data;
            const month = date ? date.split("-")[1] : null;

            if (!team || !result || !date || !month) return;

            const gameId = `${team}_${date}`;

            if (!countedGames.has(gameId)) {
                countedGames.add(gameId);

                if (!teamMonthData[team]) teamMonthData[team] = {};
                if (!teamMonthData[team][month]) {
                    teamMonthData[team][month] = { wins: 0, losses: 0 };
                }

                if (result === "W") {
                    teamMonthData[team][month].wins++;
                } else if (result === "L") {
                    teamMonthData[team][month].losses++;
                }
            }
        });

        const monthMap = {
            "10": "October",
            "11": "November",
            "12": "December",
            "01": "January",
           //"02": "February"
        };
        
        const months = Object.keys(monthMap);

        const dropdown = d3.select("#monthFilter")
            .on("change", function () {
                updateChart(this.value);
            });

        dropdown.selectAll("option")
            .data(months)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => monthMap[d]);

        const width = Math.min(window.innerWidth * 0.6, 600);
        const height = Math.min(window.innerHeight * 0.6, 600);
        const radius = Math.min(width, height) / 2;

        const svg = d3.select(".pie-chart-container")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        svg.labelVisible = true; 

        const pie = d3.pie().value(d => d.wins + d.losses);
        const arc = d3.arc().outerRadius(radius).innerRadius(0);
        const colorScale = d3.scaleOrdinal(d3.schemeSet3);

        function updateChart(month) {
            const monthData = Object.keys(teamMonthData).map(team => ({
                team,
                wins: teamMonthData[team][month]?.wins || 0,
                losses: teamMonthData[team][month]?.losses || 0
            }));

            svg.selectAll("path").remove();

            const arcs = svg.selectAll("path")
                .data(pie(monthData))
                .enter()
                .append("path")
                .attr("d", arc)
                .attr("fill", (d, i) => colorScale(i))
                .attr("opacity", 0.85)
                .on("click", function (event, d) {
                    const selectedTeam = d.data.team;
                    const selectedColor = d3.select(this).attr('fill');
                    const wins = d.data.wins;
                    const losses = d.data.losses;

                    // Reset all slices
                    svg.selectAll("path")
                        .attr("opacity", 0.85)
                        .classed("active", false)
                        .attr("transform", "translate(0,0)");

                    // Highlight selected slice and move it outward
                    const [x, y] = arc.centroid(d);
                    d3.select(this)
                        .attr("opacity", 1)
                        .classed("active", true)
                        .attr("transform", `translate(${x * 0.15}, ${y * 0.15})`);

                    updateBarChart(selectedTeam, selectedColor);
                    d3.select("#teamFilter").property("value", selectedTeam);

                    d3.select("#teamStatsDisplay").html(`
                        <span style="color: ${selectedColor};">${selectedTeam}</span> - 
                        Wins: ${wins}, Losses: ${losses}
                    `);
                });

            svg.selectAll(".label-group").remove();
            svg.labelVisible = true;

            const labelsGroup = svg.selectAll(".label-group")
                .data(pie(monthData))
                .enter()
                .append("g")
                .attr("class", "label-group");

            labelsGroup.append("text")
                .attr("class", "label")
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("transform", d => {
                    const pos = arc.centroid(d);
                    return `translate(${pos[0] * 1.6}, ${pos[1] * 1.6})`;
                })
                .style("font-size", "10px")
                .style("font-weight", "bold")
                .style("fill", "black")
                .text(d => d.data.team);
        }

        updateChart(months[0]);
    });
});
