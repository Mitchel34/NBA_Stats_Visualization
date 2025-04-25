import { loadTradeData, getPlayerGamesAfterTrade, calculatePlayerStats, getTeamGamesAfterTrade, calculateWinPercentageTimeline } from './tradeData.js';
import { generateMockGames } from './mockTradeData.js'; // Import mock data generator

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Trades Page Loaded');
    const tradeSelect = document.getElementById('trade-select');
    let allGamesData = []; // Will hold combined real + mock data
    let playerStatsChart = null;
    let teamWinPercentageChart = null;

    // --- Trade Data --- //
    const trades = {
        'LAL-DAL': {
            date: '2025-02-01',
            teams: ['LAL', 'DAL'],
            players: {
                'LAL': { acquired: ["Luka Dončić"], traded: ["Anthony Davis"] },
                'DAL': { acquired: ["Anthony Davis"], traded: ["Luka Dončić"] }
            },
            keyPlayers: ["Luka Dončić", "Anthony Davis"]
        },
        'MIL-WAS': {
            date: '2025-02-05',
            teams: ['MIL', 'WAS'],
            players: {
                'MIL': { acquired: ["Khris Middleton"], traded: ["Kyle Kuzma", "Jericho Sims"] },
                'WAS': { acquired: ["Kyle Kuzma", "AJ Johnson"], traded: ["Khris Middleton"] }
            },
            keyPlayers: ["Khris Middleton", "Kyle Kuzma"]
        },
        'TOR-NOP': {
            date: '2025-02-06',
            teams: ['TOR', 'NOP'],
            players: {
                'NOP': { acquired: ["Brandon Ingram"], traded: ["Bruce Brown", "Kelly Olynyk"] },
                'TOR': { acquired: ["Bruce Brown", "Kelly Olynyk"], traded: ["Brandon Ingram"] }
            },
            keyPlayers: ["Brandon Ingram", "Bruce Brown"]
        },
        'CLE-ATL': {
            date: '2025-02-06',
            teams: ['CLE', 'ATL'],
            players: {
                'ATL': { acquired: ["De'Andre Hunter"], traded: ["Caris LeVert", "Georges Niang"] },
                'CLE': { acquired: ["Caris LeVert", "Georges Niang"], traded: ["De'Andre Hunter"] }
            },
            keyPlayers: ["De'Andre Hunter", "Caris LeVert"]
        }
    };

    // --- Trade Selection Logic --- //
    if (tradeSelect) {
        tradeSelect.addEventListener('change', (e) => {
            handleTradeSelection(e.target.value);
        });
    }

    async function handleTradeSelection(tradeId) {
        console.log(`Handling trade selection for: ${tradeId}`); // Log trade ID
        if (!tradeId || !allGamesData.length) {
            console.log('No trade selected or no game data, clearing charts.');
            clearCharts();
            return;
        }
        const tradeInfo = trades[tradeId];
        if (!tradeInfo) {
            console.error(`Trade info not found for ID: ${tradeId}`);
            return;
        }
        console.log('Trade Info:', tradeInfo); // Log trade info

        // 1. Player Stats
        const playerStats = {};
        for (const player of tradeInfo.keyPlayers) {
            let newTeam = Object.keys(tradeInfo.players).find(team => tradeInfo.players[team].acquired.includes(player));
            const games = getPlayerGamesAfterTrade(allGamesData, player, newTeam, tradeInfo.date);
            playerStats[player] = { ...calculatePlayerStats(games), team: newTeam };
        }
        console.log('Calculated Player Stats:', playerStats); // Log player stats
        updatePlayerStatsChart(playerStats, tradeInfo);

        // 2. Team Win Percentages
        const teamWinPercentages = {};
        for (const team of tradeInfo.teams) {
            const games = getTeamGamesAfterTrade(allGamesData, team, tradeInfo.date);
            teamWinPercentages[team] = calculateWinPercentageTimeline(games, team);
        }
        console.log('Calculated Team Win Percentages:', teamWinPercentages); // Log team win percentages

        // Find the latest date from the win percentage timelines
        let latestDate = tradeInfo.date;
        tradeInfo.teams.forEach(team => {
            const timeline = teamWinPercentages[team];
            if (timeline && timeline.length > 0) {
                const lastDate = timeline[timeline.length - 1].date;
                if (new Date(lastDate) > new Date(latestDate)) {
                    latestDate = lastDate;
                }
            }
        });
        console.log(`Setting chart date range: ${tradeInfo.date} to ${latestDate}`); // Log date range

        updateTeamWinPercentageChart(teamWinPercentages, tradeInfo, latestDate);
    }

    // --- Chart Update Functions --- //
    function updatePlayerStatsChart(playerStats, tradeInfo) {
        const ctx = document.getElementById('player-stats-chart').getContext('2d');
        const labels = tradeInfo.keyPlayers;
        const ppgData = labels.map(p => parseFloat(playerStats[p]?.avgPpg || 0));
        const mpgData = labels.map(p => parseFloat(playerStats[p]?.avgMpg || 0));

        if (playerStatsChart) {
            playerStatsChart.destroy();
        }

        playerStatsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(p => `${p} (${playerStats[p]?.team})`),
                datasets: [
                    {
                        label: 'Avg PPG (Post-Trade)',
                        data: ppgData,
                        backgroundColor: 'rgba(206, 17, 65, 0.7)', // NBA Red
                        borderColor: 'rgba(206, 17, 65, 1)',
                        borderWidth: 1,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    },
                    {
                        label: 'Avg MPG (Post-Trade)',
                        data: mpgData,
                        backgroundColor: 'rgba(23, 64, 139, 0.7)', // NBA Blue
                        borderColor: 'rgba(23, 64, 139, 1)',
                        borderWidth: 1,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true, // Change back to true
                aspectRatio: 1.75, // Add/adjust this (e.g., 1.75 means width is 1.75x height)
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        position: 'nearest',
                        yAlign: 'center', // Position tooltip in the vertical center
                        xAlign: 'center', // Position tooltip in the horizontal center
                        caretPadding: 10, // Add padding for the caret
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                let value = '';

                                if (context.parsed.y !== null) {
                                    // Format the value based on the dataset label
                                    if (context.dataset.label === 'Avg PPG (Post-Trade)') {
                                        value = context.parsed.y.toFixed(2); // Format PPG to 2 decimal places
                                    } else if (context.dataset.label === 'Avg MPG (Post-Trade)') {
                                        value = context.parsed.y.toFixed(1); // Format MPG to 1 decimal places
                                    } else {
                                        value = context.parsed.y; // Default formatting
                                    }
                                }

                                if (label) {
                                    label += ': ';
                                }
                                label += value; // Add the formatted value

                                // Add additional stats (FG%, Games Played)
                                const playerName = context.label.split(' (')[0];
                                const stats = playerStats[playerName];
                                if (stats) {
                                    label += ` (FG%: ${parseFloat(stats.fgPct).toFixed(1)}%, Games: ${stats.gamesPlayed})`;
                                }
                                return label;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: true,
                    axis: 'x' // restricts hover to x-axis (bars)
                },
                hover: {
                    mode: 'index',
                    intersect: true,
                    animationDuration: 0
                },
                animation: {
                    duration: 500 // Faster animations
                },
                onHover: (event, elements) => {
                    if (elements.length > 0) {
                        const element = elements[0];
                        const index = element.index; // Index of the player
                        const playerLabel = playerStatsChart.data.labels[index];
                        const playerName = playerLabel.split(' (')[0];
                        const playerTeam = playerStats[playerName].team;

                        // Highlight both bars for the hovered player
                        highlightHoveredPlayerBars(index);

                        // Highlight the corresponding team in the win percentage chart
                        highlightTeamLine(playerTeam);
                    } else {
                        // Reset all highlights when not hovering
                        resetHighlights();
                    }
                }
            }
        });
    }

    // --- NEW FUNCTION ---
    // Function to highlight both bars (PPG & MPG) for the hovered player
    function highlightHoveredPlayerBars(playerIndex) {
        if (!playerStatsChart) return;

        const numPlayers = playerStatsChart.data.labels.length;

        playerStatsChart.data.datasets.forEach((dataset, datasetIndex) => {
            const highlightColor = datasetIndex === 0 ? 'rgba(206, 17, 65, 0.9)' : 'rgba(23, 64, 139, 0.9)'; // Brighter
            const dimColor = datasetIndex === 0 ? 'rgba(206, 17, 65, 0.3)' : 'rgba(23, 64, 139, 0.3)'; // Dimmed

            // Create new arrays for background colors and border widths
            const backgroundColors = [];
            const borderWidhts = [];

            for (let i = 0; i < numPlayers; i++) {
                if (i === playerIndex) {
                    backgroundColors.push(highlightColor); // Highlight this player's bar
                    borderWidhts.push(2);
                } else {
                    backgroundColors.push(dimColor); // Dim other players' bars
                    borderWidhts.push(1);
                }
            }
            dataset.backgroundColor = backgroundColors;
            dataset.borderWidth = borderWidhts;
        });

        playerStatsChart.update('none');
    }

    // Function to highlight a specific team's line in the win percentage chart
    function highlightTeamLine(teamToHighlight) {
        if (!teamWinPercentageChart) return;
        
        teamWinPercentageChart.data.datasets.forEach(dataset => {
            const team = dataset.label; // Assuming label is the team abbreviation
            const originalColor = getTeamColor(team, dataset.index); // Get original color
            
            if (team === teamToHighlight) {
                // Highlight the selected team
                dataset.borderColor = originalColor.replace(/rgba\(([^,]+,[^,]+,[^,]+),[^)]+\)/, 'rgba($1, 1)'); // Ensure full opacity
                dataset.borderWidth = 4;
                dataset.pointRadius = 8;
                dataset.pointHoverRadius = 10;
                dataset.z = 100; // Bring to front
            } else {
                // Dim other teams
                dataset.borderColor = originalColor.replace(/rgba\(([^,]+,[^,]+,[^,]+),[^)]+\)/, 'rgba($1, 0.3)'); // Dim opacity
                dataset.borderWidth = 1;
                dataset.pointRadius = 6; // Ensure reset goes back to size 6
                dataset.pointHoverRadius = 9;
                dataset.z = 1;
            }
        });
        
        teamWinPercentageChart.update('none'); // Use 'none' to skip animation for immediate update
    }

    // Function to reset all highlights
    function resetHighlights() {
        // Reset player stats chart
        if (playerStatsChart) {
            const numPlayers = playerStatsChart.data.labels.length;
            playerStatsChart.data.datasets.forEach((dataset, datasetIndex) => {
                const defaultColor = datasetIndex === 0 ? 'rgba(206, 17, 65, 0.7)' : 'rgba(23, 64, 139, 0.7)';
                // Reset background color to an array of default colors
                dataset.backgroundColor = new Array(numPlayers).fill(defaultColor);
                // Reset border width to an array of default widths
                dataset.borderWidth = new Array(numPlayers).fill(1);
            });
            playerStatsChart.update('none'); // Use 'none' to skip animation
        }

        // Reset team win percentage chart
        if (teamWinPercentageChart) {
            teamWinPercentageChart.data.datasets.forEach((dataset, index) => {
                const teamAbbr = dataset.label;
                const teamColor = getTeamColor(teamAbbr, index);
                
                dataset.borderColor = teamColor; // Reset to original color and opacity
                dataset.borderWidth = 2;
                dataset.pointRadius = 6; // Ensure reset goes back to size 6
                dataset.pointHoverRadius = 9;
                dataset.z = 10 - index;
            });
            teamWinPercentageChart.update('none'); // Use 'none' to skip animation
        }
    }

    // Helper function to get team color (ensure this is defined or accessible)
    function getTeamColor(teamAbbr, index) {
        // Define team colors (ensure this matches the colors used in updateTeamWinPercentageChart)
        const teamColors = {
            'LAL': 'rgba(85, 37, 130, 1)', 'DAL': 'rgba(0, 83, 188, 1)', 'MIL': 'rgba(0, 71, 27, 1)',
            'WAS': 'rgba(0, 43, 92, 1)', 'TOR': 'rgba(206, 17, 65, 1)', 'NOP': 'rgba(0, 22, 65, 1)',
            'CLE': 'rgba(134, 0, 56, 1)', 'ATL': 'rgba(225, 68, 52, 1)'
        };
        const defaultColors = [
            'rgba(206, 17, 65, 1)', 'rgba(23, 64, 139, 1)', 'rgba(0, 125, 195, 1)', 'rgba(253, 185, 39, 1)'
        ];
        return teamColors[teamAbbr] || defaultColors[index % defaultColors.length];
    }

    function updateTeamWinPercentageChart(teamWinPercentages, tradeInfo, latestDate) { 
        const ctx = document.getElementById('team-win-percentage-chart').getContext('2d');
        const datasets = [];
        
        // NBA team colors map (ensure this is consistent or defined globally)
        const teamColors = {
            'LAL': {color: 'rgba(85, 37, 130, 1)'}, 'DAL': {color: 'rgba(0, 83, 188, 1)'}, 'MIL': {color: 'rgba(0, 71, 27, 1)'},
            'WAS': {color: 'rgba(0, 43, 92, 1)'}, 'TOR': {color: 'rgba(206, 17, 65, 1)'}, 'NOP': {color: 'rgba(0, 22, 65, 1)'},
            'CLE': {color: 'rgba(134, 0, 56, 1)'}, 'ATL': {color: 'rgba(225, 68, 52, 1)'}
        };
        const defaultColors = [
            'rgba(206, 17, 65, 1)', 'rgba(23, 64, 139, 1)', 'rgba(0, 125, 195, 1)', 'rgba(253, 185, 39, 1)'
        ];

        // Create a mapping of teams to players involved in the trade
        const teamToPlayersMap = {};
        tradeInfo.keyPlayers.forEach(player => {
            const team = Object.keys(tradeInfo.players).find(t => tradeInfo.players[t].acquired.includes(player));
            if (team) {
                if (!teamToPlayersMap[team]) {
                    teamToPlayersMap[team] = [];
                }
                teamToPlayersMap[team].push(player);
            }
        });

        // Simplify data processing
        tradeInfo.teams.forEach((teamAbbr, index) => {
            const teamData = teamWinPercentages[teamAbbr] || [];
            if (teamData.length > 0) {
                const teamColor = teamColors[teamAbbr]?.color || defaultColors[index % defaultColors.length];
                datasets.push({
                    label: `${teamAbbr}`, // Use only team abbreviation for label
                    team: teamAbbr, // Store team abbreviation for easier access
                    originalColor: teamColor, // Store original color
                    data: teamData.map(point => ({ x: point.date, y: parseFloat(point.winPct) })),
                    borderColor: teamColor,
                    backgroundColor: teamColor.replace('1)', '0.1)'),
                    tension: 0.2,
                    fill: false,
                    pointRadius: 6, // Ensure all points start at size 6
                    pointHoverRadius: 9,
                    pointBackgroundColor: teamColor,
                    pointBorderColor: 'white',
                    pointBorderWidth: 1.5,
                    pointHitRadius: 10,
                    borderWidth: 2,
                    spanGaps: true,
                    z: 10 - index
                });
            }
        });

        if (teamWinPercentageChart) {
            teamWinPercentageChart.destroy();
        }

        teamWinPercentageChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Changed to false to use container dimensions
                scales: {
                    x: { 
                        // ... existing x-axis config ...
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'MMM dd, yyyy',
                            displayFormats: { day: 'MMM dd' }
                        },
                        title: { display: true, text: 'Date' },
                        min: tradeInfo.date,
                        max: latestDate
                    },
                    y: { 
                        // ... existing y-axis config ...
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Win Percentage (%)' }
                    }
                },
                plugins: {
                    tooltip: {
                        // ... existing tooltip config ...
                        enabled: true,
                        mode: 'point',
                        intersect: true,
                        position: 'nearest',
                        callbacks: {
                            label: function(context) {
                                const teamAbbr = context.dataset.label;
                                return `${teamAbbr} Win %: ${context.parsed.y.toFixed(1)}%`;
                            },
                            title: function(tooltipItems) {
                                if (tooltipItems.length > 0) {
                                    const date = new Date(tooltipItems[0].parsed.x);
                                    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                }
                                return '';
                            }
                        }
                    },
                    legend: { 
                        // ... existing legend config ...
                        position: 'top' 
                    }
                },
                interaction: {
                    mode: 'point', 
                    intersect: true,
                    axis: 'xy'
                },
                hover: {
                    mode: 'point',
                    intersect: true,
                    animationDuration: 0
                },
                elements: {
                    point: {
                        radius: 6, // Visible point size
                        hitRadius: 4, // Reduce for more precise hover
                        hoverRadius: 9 
                    }
                },
                onHover: (event, elements) => {
                    if (elements.length > 0) {
                        const element = elements[0];
                        const datasetIndex = element.datasetIndex;
                        const team = teamWinPercentageChart.data.datasets[datasetIndex].team;
                        
                        // Highlight this team's line
                        highlightTeamLine(team);
                        
                        // Find players on this team and highlight their bars
                        const players = teamToPlayersMap[team] || [];
                        if (players.length > 0) {
                            highlightPlayerBars(players);
                        }
                    } else {
                        // Reset all highlights when not hovering
                        resetHighlights();
                    }
                },
                animation: {
                    duration: 500
                }
            }
        });
    }

    // Function to highlight player bars based on team selection
    function highlightPlayerBars(playersToHighlight) {
        if (!playerStatsChart) return;
        
        const allPlayerLabels = playerStatsChart.data.labels;
        const highlightIndices = [];

        // Find indices of players to highlight
        allPlayerLabels.forEach((label, index) => {
            const playerName = label.split(' (')[0];
            if (playersToHighlight.includes(playerName)) {
                highlightIndices.push(index);
            }
        });

        // Apply highlighting/dimming
        playerStatsChart.data.datasets.forEach((dataset, datasetIndex) => {
            const defaultColor = datasetIndex === 0 ? 'rgba(206, 17, 65, 0.7)' : 'rgba(23, 64, 139, 0.7)';
            const highlightColor = datasetIndex === 0 ? 'rgba(206, 17, 65, 0.9)' : 'rgba(23, 64, 139, 0.9)';
            const dimColor = datasetIndex === 0 ? 'rgba(206, 17, 65, 0.3)' : 'rgba(23, 64, 139, 0.3)';

            dataset.backgroundColor = allPlayerLabels.map((label, index) => {
                return highlightIndices.includes(index) ? highlightColor : dimColor;
            });
            dataset.borderWidth = allPlayerLabels.map((label, index) => {
                return highlightIndices.includes(index) ? 2 : 1;
            });
        });

        playerStatsChart.update('none');
    }

    function clearCharts() {
        if (playerStatsChart) {
            playerStatsChart.destroy();
            playerStatsChart = null;
        }
        if (teamWinPercentageChart) {
            teamWinPercentageChart.destroy();
            teamWinPercentageChart = null;
        }
        const playerCanvas = document.getElementById('player-stats-chart');
        const teamCanvas = document.getElementById('team-win-percentage-chart');
        if (playerCanvas) {
            const playerCtx = playerCanvas.getContext('2d');
            playerCtx.clearRect(0, 0, playerCtx.canvas.width, playerCtx.canvas.height);
        }
        if (teamCanvas) {
            const teamCtx = teamCanvas.getContext('2d');
            teamCtx.clearRect(0, 0, teamCtx.canvas.width, teamCtx.canvas.height);
        }
    }

    // --- Initial Load --- //
    async function init() {
        try {
            const realGamesData = await loadTradeData();
            console.log(`Loaded ${realGamesData.length} real game records.`);

            // Define the date range for mock data
            const mockStartDate = '2025-02-08'; // Start after the last real data
            const mockEndDate = '2025-04-01';

            // Generate mock games
            const mockGamesData = generateMockGames(mockStartDate, mockEndDate, trades);

            // Combine real and mock data
            allGamesData = [...realGamesData, ...mockGamesData];

            // Sort combined data by date
            allGamesData.sort((a, b) => new Date(a.Data) - new Date(b.Data));

            console.log(`Total game records (real + mock): ${allGamesData.length}`);
            console.log(`First record:`, allGamesData.length > 0 ? allGamesData[0] : 'No data');
            console.log(`Last record:`, allGamesData.length > 0 ? allGamesData[allGamesData.length - 1] : 'No data');

            if (tradeSelect.value) {
                handleTradeSelection(tradeSelect.value);
            } else {
                // Optionally, trigger the first trade automatically if none is selected
                if (Object.keys(trades).length > 0) {
                    const firstTradeId = Object.keys(trades)[0];
                    tradeSelect.value = firstTradeId; // Update dropdown
                    handleTradeSelection(firstTradeId); // Load data for the first trade
                }
            }
        } catch (error) {
            console.error('Error during initial data load and processing:', error);
        }
    }

    init();
});