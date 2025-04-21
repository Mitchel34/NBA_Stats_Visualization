document.addEventListener("DOMContentLoaded", function () {
    d3.csv("../data/database_24_25.csv").then(data => {
        const teamMonthData = {};
        const countedGames = new Set(); // 🆕 Track (team + date) combinations to avoid duplicates

        // Step 1: Deduplicate game results by team-date combination
        data.forEach(row => {
            const team = row.Tm;
            const result = row.Res;
            const date = row.Data;
            const month = date ? date.split("-")[1] : null;

            if (!team || !result || !date || !month) return;

            const gameId = `${team}_${date}`; // Unique ID for one team's game

            // Avoid duplicate games for the same team on the same date
            if (!countedGames.has(gameId)) {
                countedGames.add(gameId); // Mark this game as counted

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

        console.log("Aggregated Team Month Data:", teamMonthData); // Check if data is aggregated correctly

        //const months = ["10", "11", "12", "01", "02"];

        const monthMap = {
            "10": "October",
            "11": "November",
            "12": "December",
            "01": "January",
            "02": "February"
        };
        
        const months = Object.keys(monthMap);

        // const dropdown = d3.select(".pie-chart-container")//("body")
        //     .append("select")
        //     .attr("id", "monthFilter")
        const dropdown = d3.select("#monthFilter")
            .on("change", function () {
                updateChart(this.value);
            });

        dropdown.selectAll("option")//("option")
            .data(months)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => monthMap[d]);

        const width = Math.min(window.innerWidth * 0.6, 600);
        const height = Math.min(window.innerHeight * 0.6, 600);
        const radius = Math.min(width, height) / 2;

        const svg = d3.select(".pie-chart-container")//("#championship")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        svg.labelVisible = true; // 🆕 Track label visibility

        const pie = d3.pie().value(d => d.wins + d.losses);
        const arc = d3.arc().outerRadius(radius).innerRadius(0);

        function updateChart(month) {
            const monthData = Object.keys(teamMonthData).map(team => ({
                team,
                wins: teamMonthData[team][month]?.wins || 0,
                losses: teamMonthData[team][month]?.losses || 0
            }));

            const pie = d3.pie().value(d => d.wins + d.losses);
            const arc = d3.arc().outerRadius(radius).innerRadius(0);
            const colorScale = d3.scaleOrdinal(d3.schemeSet3);

            svg.selectAll("path").remove();

            const arcs = svg.selectAll("path")
                .data(pie(monthData))
                .enter()
                .append("path")
                .attr("d", arc)
                .attr("fill", (d, i) => colorScale(i))
                .attr("opacity", 0.85)
                .on("click", function (event, d) 
                {
                    console.log("Clicked Slice Data:", d.data);

                    const isActive = d3.select(this).classed("active");
                
                    // Reset all slices
                    d3.selectAll("path").attr("opacity", 0.85).classed("active", false);
                    d3.selectAll(".detail-group").remove();
                
                    // If already active, reset and show labels
                    if (isActive) {
                        svg.selectAll(".label-group").style("display", null); // show labels again
                        return;
                    }
                
                    // Highlight clicked slice and mark as active
                    d3.select(this).attr("opacity", 1).classed("active", true);
                
                    // Hide the team name labels
                    svg.selectAll(".label-group").style("display", "none");
                
                    // Add white box and win/loss text
                    const detailGroup = svg.append("g")
                        .attr("class", "detail-group")
                        .attr("transform", `translate(0, ${radius - 50})`)
                        .style("opacity", 0);
                
                    const boxWidth = 180;
                    const boxHeight = 30;
                
                    detailGroup.append("rect")
                        .attr("x", -boxWidth / 2)
                        .attr("y", -boxHeight / 2)
                        .attr("width", boxWidth)
                        .attr("height", boxHeight)
                        .attr("fill", "white")
                        .attr("stroke", "black")
                        .attr("stroke-width", 1)
                        .attr("rx", 5)
                        .attr("ry", 5)
                        .attr("opacity", 0.9);
                
                    detailGroup.append("text")
                        .attr("text-anchor", "middle")
                        .style("font-size", "16px")
                        .style("font-weight", "bold")
                        .style("fill", "black")
                        .text(`${d.data.team}: ${d.data.wins}W, ${d.data.losses}L`);
                
                    detailGroup.transition()
                        .duration(300)
                        .style("opacity", 1);
                });

            svg.selectAll(".label-group").remove(); // Clear existing labels before re-rendering

            // 🆕 Reset label visibility on chart update
            svg.labelVisible = true;

            const labelsGroup = svg.selectAll(".label-group")
                .data(pie(monthData))
                .enter()
                .append("g")
                .attr("class", "label-group");

            labelsGroup.append("rect")
                .attr("rx", 5)
                .attr("ry", 5)
                .attr("fill", "white")
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("opacity", 0.8)
                .attr("width", 80)
                .attr("height", 25)
                .attr("transform", d => {
                    const pos = arc.centroid(d);
                    return `translate(${pos[0] * 1.4 - 40}, ${pos[1] * 1.4 - 12})`;
                });

            labelsGroup.append("text")
                .attr("class", "label")
                .attr("text-anchor", "middle")
                .attr("transform", d => {
                    const pos = arc.centroid(d);
                    return `translate(${pos[0] * 1.4}, ${pos[1] * 1.4})`;
                })
                .style("font-size", "12px")
                .style("font-weight", "bold")
                .style("fill", "black")
                .text(d => d.data.team);

            svg.selectAll("text.title").remove();
            svg.append("text")
                .attr("class", "title")
                .attr("x", 0)
                .attr("y", -radius - 20)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .text(`Team Performance in Month ${monthMap[month]}`);
        }

        updateChart(months[0]);
    });
});
