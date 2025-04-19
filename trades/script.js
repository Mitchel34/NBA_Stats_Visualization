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
                        borderWidth: 1
                    },
                    {
                        label: 'Avg MPG (Post-Trade)',
                        data: mpgData,
                        backgroundColor: 'rgba(23, 64, 139, 0.7)', // NBA Blue
                        borderColor: 'rgba(23, 64, 139, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
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
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                }
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
                animation: {
                    duration: 500 // Faster animations
                }
            }
        });
    }

    function updateTeamWinPercentageChart(teamWinPercentages, tradeInfo, latestDate) { // Add latestDate parameter
        const ctx = document.getElementById('team-win-percentage-chart').getContext('2d');
        const datasets = [];
        
        // NBA team colors map
        const teamColors = {
            'LAL': {color: 'rgba(85, 37, 130, 1)', secondary: 'rgba(253, 185, 39, 1)'}, // Lakers - Purple & Gold
            'DAL': {color: 'rgba(0, 83, 188, 1)', secondary: 'rgba(0, 43, 92, 1)'}, // Mavericks - Blue
            'MIL': {color: 'rgba(0, 71, 27, 1)', secondary: 'rgba(240, 235, 210, 1)'}, // Bucks - Green & Cream
            'WAS': {color: 'rgba(0, 43, 92, 1)', secondary: 'rgba(227, 24, 55, 1)'}, // Wizards - Navy & Red
            'TOR': {color: 'rgba(206, 17, 65, 1)', secondary: 'rgba(0, 0, 0, 1)'}, // Raptors - Red & Black
            'NOP': {color: 'rgba(0, 22, 65, 1)', secondary: 'rgba(225, 58, 62, 1)'}, // Pelicans - Navy & Red
            'CLE': {color: 'rgba(134, 0, 56, 1)', secondary: 'rgba(253, 187, 48, 1)'}, // Cavaliers - Wine & Gold
            'ATL': {color: 'rgba(225, 68, 52, 1)', secondary: 'rgba(196, 214, 0, 1)'}, // Hawks - Red & Volt Green
            // Add more teams as needed
        };

        // Default colors if team not in the map
        const defaultColors = [
            'rgba(206, 17, 65, 1)', // NBA Red
            'rgba(23, 64, 139, 1)',  // NBA Blue
            'rgba(0, 125, 195, 1)',  // Light Blue
            'rgba(253, 185, 39, 1)'  // Gold
        ];

        // Simplify data processing to improve performance
        tradeInfo.teams.forEach((teamAbbr, index) => {
            const teamData = teamWinPercentages[teamAbbr] || [];
            
            // Only use actual data points without interpolation
            if (teamData.length > 0) {
                // Use team colors if available, otherwise fall back to default colors
                const teamColor = teamColors[teamAbbr] 
                    ? teamColors[teamAbbr].color 
                    : defaultColors[index % defaultColors.length];
                
                datasets.push({
                    label: `${teamAbbr} Win % (Post-Trade)`,
                    data: teamData.map(point => ({
                        x: point.date,
                        y: parseFloat(point.winPct)
                    })),
                    borderColor: teamColor,
                    backgroundColor: teamColor.replace('1)', '0.1)'),
                    tension: 0.2,
                    fill: false,
                    pointRadius: 3,
                    borderWidth: 2,
                    spanGaps: true
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
                maintainAspectRatio: true,
                aspectRatio: 2,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'MMM dd, yyyy',
                            displayFormats: {
                                day: 'MMM dd'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        },
                        min: tradeInfo.date, // Set min date to trade date
                        max: latestDate      // Set max date to latest game date
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Win Percentage (%)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top'
                    }
                },
                animation: {
                    duration: 500 // Faster animations
                }
            }
        });
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