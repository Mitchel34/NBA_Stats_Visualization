import { loadTradeData, getPlayerGamesAfterTrade, calculatePlayerStats, getTeamGamesAfterTrade, calculateWinPercentageTimeline } from './tradeData.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Trades Page Loaded');
    const tradeSelect = document.getElementById('trade-select');
    let allGamesData = [];
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
        if (!tradeId || !allGamesData.length) {
            clearCharts();
            return;
        }
        const tradeInfo = trades[tradeId];
        if (!tradeInfo) return;

        // 1. Player Stats
        const playerStats = {};
        for (const player of tradeInfo.keyPlayers) {
            let newTeam = Object.keys(tradeInfo.players).find(team => tradeInfo.players[team].acquired.includes(player));
            const games = getPlayerGamesAfterTrade(allGamesData, player, newTeam, tradeInfo.date);
            playerStats[player] = { ...calculatePlayerStats(games), team: newTeam };
        }
        updatePlayerStatsChart(playerStats, tradeInfo);

        // 2. Team Win Percentages
        const teamWinPercentages = {};
        for (const team of tradeInfo.teams) {
            const games = getTeamGamesAfterTrade(allGamesData, team, tradeInfo.date);
            teamWinPercentages[team] = calculateWinPercentageTimeline(games, team);
        }
        updateTeamWinPercentageChart(teamWinPercentages, tradeInfo);
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

    function updateTeamWinPercentageChart(teamWinPercentages, tradeInfo) {
        const ctx = document.getElementById('team-win-percentage-chart').getContext('2d');
        const datasets = [];
        // Use NBA colors
        const colors = [
            'rgba(206, 17, 65, 1)', // NBA Red
            'rgba(23, 64, 139, 1)',  // NBA Blue
            'rgba(0, 125, 195, 1)',  // Light Blue
            'rgba(253, 185, 39, 1)'  // Gold
        ];
        let colorIndex = 0;

        // Simplify data processing to improve performance
        tradeInfo.teams.forEach(teamAbbr => {
            const teamData = teamWinPercentages[teamAbbr] || [];
            
            // Only use actual data points without interpolation
            if (teamData.length > 0) {
                datasets.push({
                    label: `${teamAbbr} Win % (Post-Trade)`,
                    data: teamData.map(point => ({
                        x: point.date,
                        y: parseFloat(point.winPct)
                    })),
                    borderColor: colors[colorIndex % colors.length],
                    backgroundColor: colors[colorIndex % colors.length].replace('1)', '0.1)'),
                    tension: 0.2,
                    fill: false,
                    pointRadius: 3,
                    borderWidth: 2,
                    spanGaps: true
                });
                colorIndex++;
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
                        }
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
            allGamesData = await loadTradeData();
            console.log(`Loaded ${allGamesData.length} game records`);
            if (tradeSelect.value) {
                handleTradeSelection(tradeSelect.value);
            }
        } catch (error) {
            console.error('Error loading trade data:', error);
        }
    }

    init();
});