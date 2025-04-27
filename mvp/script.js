// Use d3.csv for loading, but Chart.js for plotting
// Keep track of chart instances to destroy them before redrawing
let mvpScatterChartInstance = null;
let mvpBarChartInstance = null;
let mvpScoreBarChartInstance = null; // Add instance tracker for the new chart
let hoveredPlayer = null; // Track the player being hovered over

// Helper function to convert hex color to rgba with alpha
function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(128, 128, 128, ${alpha})`; // Default gray if hex is missing
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Function to update highlighting across all charts
function applyHighlighting() {
    if (mvpScatterChartInstance) mvpScatterChartInstance.update('none'); // Update without animation
    if (mvpBarChartInstance) mvpBarChartInstance.update('none');
    if (mvpScoreBarChartInstance) mvpScoreBarChartInstance.update('none');
}

d3.csv("../data/database_24_25.csv").then(function(data) {
    // Parse numeric values per game
    data.forEach(d => {
        d.MP = +d.MP;
        d.PTS = +d.PTS;
        d.AST = +d.AST;
        d.TRB = +d.TRB;
        d.FG_perc = +d['FG%'] || 0;
        d.GmSc = +d.GmSc || 0;
    });

    // Aggregate per-player averages across all games
    const aggregated = Array.from(
        d3.group(data, d => d.Player),
        ([player, games]) => ({
            Player: player,
            Tm: games[games.length - 1].Tm, // last team entry
            MP: d3.mean(games, g => g.MP),
            PTS: d3.mean(games, g => g.PTS),
            AST: d3.mean(games, g => g.AST),
            TRB: d3.mean(games, g => g.TRB),
            FG_perc: d3.mean(games, g => g.FG_perc),
            GmSc: d3.mean(games, g => g.GmSc)
        })
    );

    // Compute MVP Score on averaged stats
    aggregated.forEach(d => {
        d.mvpScore = d.PTS + (d.TRB * 1.2) + (d.AST * 1.5) + (d.FG_perc * 20) + (d.GmSc * 2);
    });

    // Use aggregated data for visualizations
    const uniquePlayers = aggregated;

    // Map team abbreviations to their primary colors
    const teamColors = {
        ATL: '#E03A3E', BOS: '#008348', BKN: '#000000', CHO: '#1C0C5B', CHI: '#CE1141',
        CLE: '#6F263D', DAL: '#00538C', DEN: '#0E2240', DET: '#003087', GSW: '#1D428A',
        HOU: '#CE1141', IND: '#002D62', LAC: '#C8102E', LAL: '#552583', MEM: '#0C2340',
        MIA: '#000000', MIL: '#00471B', MIN: '#0C2340', NOP: '#0C2340', NYK: '#006BB6',
        OKC: '#007AC1', ORL: '#0077C0', PHI: '#006BB6', PHX: '#1D1160', POR: '#E03A3E',
        SAC: '#5A2D81', SAS: '#000000', TOR: '#CE1141', UTA: '#002B5C', WAS: '#002B5C'
    };
    const teamSecondaryColors = {
        ATL: '#C1D32F', BOS: '#FFFFFF', BKN: '#FFFFFF', CHO: '#00778B', CHI: '#000000',
        CLE: '#FDBB30', DAL: '#002B5E', DEN: '#FEC524', DET: '#C8102E', GSW: '#FFC107',
        HOU: '#000000', IND: '#FDBB30', LAC: '#006BB6', LAL: '#FDB927', MEM: '#5D76A9',
        MIA: '#98002E', MIL: '#EEE1C6', MIN: '#236192', NOP: '#C8102E', NYK: '#F58426',
        OKC: '#EF3B24', ORL: '#000000', PHI: '#ED174C', PHX: '#E56020', POR: '#000000',
        SAC: '#63727A', SAS: '#C4CED4', TOR: '#000000', UTA: '#F9A01B', WAS: '#E31837'
    };
    const defaultColor = '#888888';
    function getTeamColor(team) {
        return teamColors[team] || defaultColor;
    }
    function getTeamSecondaryColor(team) {
        return teamSecondaryColors[team] || defaultColor;
    }

    // Get unique team names for dropdown and colors
    const teams = Array.from(new Set(uniquePlayers.map(d => d.Tm)));

    // Populate dropdown
    const dropdown = d3.select("#chooseTeam"); // Still using d3 for convenience here
    dropdown.selectAll("option.teamChoices")
        .data(teams)
        .enter()
        .append("option")
        .attr("class", "teamChoices")
        .attr("value", d => d)
        .text(d => d);

    // Populate team legend
    const legend = d3.select('#teamLegend');
    legend.selectAll('div.legend-item')
        .data(teams)
        .enter()
        .append('div')
        .attr('class', 'legend-item')
        .html(team => `
            <span class="legend-color-box" style="background-color: ${getTeamColor(team)}"></span>
            <span class="legend-label">${team}</span>
        `);

    function updateCharts(selectedTeam) {
        const filtered = selectedTeam === "All" ? uniquePlayers : uniquePlayers.filter(d => d.Tm === selectedTeam);

        // --- Scatter Plot (Top 10 Players by MVP Score) --- 
        const topScatterData = filtered.sort((a, b) => b.mvpScore - a.mvpScore).slice(0, 10);
        const scatterCtx = document.getElementById('mvpScatterChart').getContext('2d');
        const defaultScatterRadius = 8; // Increased default size
        const highlightedScatterRadius = 12; // Size when highlighted

        if (mvpScatterChartInstance) mvpScatterChartInstance.destroy();
        mvpScatterChartInstance = new Chart(scatterCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Top 10 Players (PTS vs MP)',
                    data: topScatterData.map(d => ({ x: d.MP, y: d.PTS, player: d.Player, team: d.Tm })),
                    // Dynamic styling based on hoveredPlayer
                    backgroundColor: (ctx) => {
                        const player = ctx.raw?.player;
                        const team = ctx.raw?.team;
                        const alpha = hoveredPlayer === null ? 1 : (player === hoveredPlayer ? 1 : 0.5);
                        return hexToRgba(getTeamColor(team), alpha);
                    },
                    borderColor: (ctx) => {
                        const player = ctx.raw?.player;
                        const team = ctx.raw?.team;
                        const alpha = hoveredPlayer === null ? 1 : (player === hoveredPlayer ? 1 : 0.5);
                        return hexToRgba(getTeamSecondaryColor(team), alpha);
                    },
                    pointRadius: (ctx) => {
                        const player = ctx.raw?.player;
                        return hoveredPlayer === null ? defaultScatterRadius : (player === hoveredPlayer ? highlightedScatterRadius : defaultScatterRadius);
                    },
                    borderWidth: 1,
                    pointHoverRadius: (ctx) => {
                        const player = ctx.raw?.player;
                        return player === hoveredPlayer ? highlightedScatterRadius : defaultScatterRadius + 2; // Slightly larger on hover if not the main highlighted one
                    },
                    pointHitRadius: 12 // Slightly reduced hit radius for better precision
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'nearest', intersect: true, axis: 'xy' }, // Require direct intersection
                // Add onHover event
                onHover: (event, activeElements, chart) => {
                    if (activeElements.length > 0) {
                        const dataIndex = activeElements[0].index;
                        const datasetIndex = activeElements[0].datasetIndex;
                        const player = chart.data.datasets[datasetIndex].data[dataIndex]?.player;
                        if (hoveredPlayer !== player) {
                            hoveredPlayer = player;
                            applyHighlighting();
                        }
                    } else {
                        if (hoveredPlayer !== null) {
                            hoveredPlayer = null;
                            applyHighlighting();
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Average Minutes Played per Game (MP)'
                        },
                        beginAtZero: true
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Average Points per Game (PTS)'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    tooltip: {
                        position: 'nearest', // Better tooltip positioning
                        yAlign: 'bottom', // Position tooltip above the point
                        xAlign: 'center', // Center horizontally
                        caretPadding: 10, // Add padding for the caret
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                return `${point.player} (${point.team}): ${point.y.toFixed(2)} PTS, ${point.x.toFixed(2)} MP`;
                            }
                        }
                    },
                    legend: {
                        display: false // Hide default legend, colors are in points
                    }
                },
                animation: {
                    duration: 500 // Faster animations like in trades page
                }
            }
        });

        // --- Bar Chart (Top Players by Points) --- 
        const topPlayersData = filtered.sort((a, b) => b.PTS - a.PTS).slice(0, 15);
        const barCtx = document.getElementById('mvpBarChart').getContext('2d');
        if (mvpBarChartInstance) mvpBarChartInstance.destroy();
        mvpBarChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: topPlayersData.map(d => `${d.Player} (${d.Tm})`), // Keep player name accessible
                datasets: [{
                    label: 'Points Per Game',
                    data: topPlayersData.map(d => d.PTS),
                    // Store player data with each bar's data point if needed, or parse from label
                    playerData: topPlayersData.map(d => ({ player: d.Player, team: d.Tm })), // Store player info
                    backgroundColor: (ctx) => {
                        const player = ctx.dataset.playerData[ctx.dataIndex]?.player;
                        const team = ctx.dataset.playerData[ctx.dataIndex]?.team;
                        const alpha = hoveredPlayer === null ? 1 : (player === hoveredPlayer ? 1 : 0.5);
                        return hexToRgba(getTeamColor(team), alpha);
                    },
                    borderColor: (ctx) => {
                        const player = ctx.dataset.playerData[ctx.dataIndex]?.player;
                        const team = ctx.dataset.playerData[ctx.dataIndex]?.team;
                        const alpha = hoveredPlayer === null ? 1 : (player === hoveredPlayer ? 1 : 0.5);
                        return hexToRgba(getTeamSecondaryColor(team), alpha);
                    },
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'nearest', intersect: true, axis: 'y' }, // Require direct intersection
                // Add onHover event
                onHover: (event, activeElements, chart) => {
                    if (activeElements.length > 0) {
                        const dataIndex = activeElements[0].index;
                        const datasetIndex = activeElements[0].datasetIndex;
                        // Extract player name - assuming label format 'Player Name (TEAM)'
                        const label = chart.data.labels[dataIndex];
                        const player = label.substring(0, label.lastIndexOf(' (')).trim(); 
                        if (hoveredPlayer !== player) {
                            hoveredPlayer = player;
                            applyHighlighting();
                        }
                    } else {
                        if (hoveredPlayer !== null) {
                            hoveredPlayer = null;
                            applyHighlighting();
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Average Points Per Game (PTS)'
                        },
                        beginAtZero: true
                    },
                    y: {
                        ticks: {
                            autoSkip: false // Ensure all labels are shown
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Only one dataset, legend not crucial
                    },
                    tooltip: {
                        position: 'nearest',
                        yAlign: 'center', // Position tooltip in the vertical center 
                        xAlign: 'right', // Position tooltip to the right of the bar
                        caretPadding: 10, // Add padding for the caret
                        callbacks: {
                            label: function(context) {
                                return ` ${context.parsed.x.toFixed(2)} PTS`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 500 // Faster animations like in trades page
                }
            }
        });

        // --- Bar Chart (Top 5 Players by MVP Score) ---
        const topMvpScoreData = filtered.sort((a, b) => b.mvpScore - a.mvpScore).slice(0, 5);
        const mvpScoreCtx = document.getElementById('mvpScoreBarChart').getContext('2d');
        if (mvpScoreBarChartInstance) mvpScoreBarChartInstance.destroy();
        mvpScoreBarChartInstance = new Chart(mvpScoreCtx, {
            type: 'bar',
            data: {
                labels: topMvpScoreData.map(d => `${d.Player} (${d.Tm})`), // Keep player name accessible
                datasets: [{
                    label: 'Calculated MVP Score',
                    data: topMvpScoreData.map(d => d.mvpScore.toFixed(2)),
                    playerData: topMvpScoreData.map(d => ({ player: d.Player, team: d.Tm })), // Store player info
                    backgroundColor: (ctx) => {
                        const player = ctx.dataset.playerData[ctx.dataIndex]?.player;
                        const team = ctx.dataset.playerData[ctx.dataIndex]?.team;
                        const alpha = hoveredPlayer === null ? 1 : (player === hoveredPlayer ? 1 : 0.5);
                        return hexToRgba(getTeamColor(team), alpha);
                    },
                    borderColor: (ctx) => {
                        const player = ctx.dataset.playerData[ctx.dataIndex]?.player;
                        const team = ctx.dataset.playerData[ctx.dataIndex]?.team;
                        const alpha = hoveredPlayer === null ? 1 : (player === hoveredPlayer ? 1 : 0.5);
                        return hexToRgba(getTeamSecondaryColor(team), alpha);
                    },
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'nearest', intersect: true, axis: 'x' }, // Require direct intersection
                // Add onHover event
                onHover: (event, activeElements, chart) => {
                    if (activeElements.length > 0) {
                        const dataIndex = activeElements[0].index;
                        // Extract player name - assuming label format 'Player Name (TEAM)'
                        const label = chart.data.labels[dataIndex];
                        const player = label.substring(0, label.lastIndexOf(' (')).trim(); 
                        if (hoveredPlayer !== player) {
                            hoveredPlayer = player;
                            applyHighlighting();
                        }
                    } else {
                        if (hoveredPlayer !== null) {
                            hoveredPlayer = null;
                            applyHighlighting();
                        }
                    }
                },
                scales: {
                    y: { // Y-axis now represents the score
                        title: {
                            display: true,
                            text: 'Calculated MVP Score'
                        },
                        beginAtZero: true
                    },
                    x: { // X-axis represents the players
                        ticks: {
                            autoSkip: false // Ensure all labels are shown
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Only one dataset
                    },
                    tooltip: {
                        position: 'nearest',
                        yAlign: 'bottom', // Position tooltip above the bar
                        xAlign: 'center', // Center horizontally
                        caretPadding: 10, // Add padding for the caret
                        callbacks: {
                            label: function(context) {
                                // Access the raw data point to get original values
                                const index = context.dataIndex;
                                const player = topMvpScoreData[index];
                                return ` Score: ${context.parsed.y.toFixed(2)} (PTS: ${player.PTS.toFixed(2)}, TRB: ${player.TRB.toFixed(2)}, AST: ${player.AST.toFixed(2)}, FG%: ${player.FG_perc.toFixed(2)}, GmSc: ${player.GmSc.toFixed(2)})`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 500 // Faster animations like in trades page
                }
            }
        });
    }

    // Initial chart rendering
    updateCharts("All");

    // Add event listener for dropdown changes
    dropdown.on("change", function() {
        const selectedTeam = this.value;
        hoveredPlayer = null; // Reset hover on dropdown change
        updateCharts(selectedTeam);
    });

}).catch(function(error) {
    console.error('Error loading or processing data:', error);
    // Optionally display an error message to the user on the page
});

