// tradeData.js
// Handles loading and processing NBA trade data for visualizations

// Loads CSV data using PapaParse (must be loaded in the page)
export async function loadTradeData(csvPath = '../data/database_24_25.csv') {
    return new Promise((resolve, reject) => {
        if (typeof Papa === 'undefined') {
            reject('PapaParse library is not loaded.');
            return;
        }
        Papa.parse(csvPath, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                resolve(results.data);
            },
            error: function(error) {
                reject(error);
            }
        });
    });
}

// Get games for a player on a specific team after a date
export function getPlayerGamesAfterTrade(data, playerName, teamAbbr, tradeDate) {
    const tradeDateObj = new Date(tradeDate);
    return data.filter(row => {
        // Use actual column names: 'Data', 'Player', 'Tm'
        const gameDate = new Date(row.Data?.substring(0, 10)); 
        return row.Player === playerName && row.Tm === teamAbbr && gameDate >= tradeDateObj;
    });
}

// Calculate player stats (PPG, MPG, FG%, games played)
export function calculatePlayerStats(games) {
    let totalPts = 0, totalMin = 0, totalFGM = 0, totalFGA = 0;
    let gamesPlayed = games.length;
    games.forEach(g => {
        totalPts += g.PTS || 0;
        let min = 0;
        // Use MP (Minutes Played) instead of MIN which doesn't exist in our data
        if (typeof g.MP === 'string' && g.MP.includes(':')) {
            const parts = g.MP.split(':');
            min = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
        } else if (typeof g.MP === 'number') {
            min = g.MP;
        }
        totalMin += min;
        totalFGM += g.FG || 0;  // Use FG instead of FGM
        totalFGA += g.FGA || 0;
    });
    return {
        avgPpg: gamesPlayed ? (totalPts / gamesPlayed) : 0,
        avgMpg: gamesPlayed ? (totalMin / gamesPlayed) : 0,
        fgPct: totalFGA ? (totalFGM / totalFGA) * 100 : 0,
        gamesPlayed
    };
}

// Get all games for a team after a date
export function getTeamGamesAfterTrade(data, teamAbbr, tradeDate) {
    const tradeDateObj = new Date(tradeDate);
    return data.filter(row => {
        // Use actual column names: 'Data', 'Tm'
        const gameDate = new Date(row.Data?.substring(0, 10));
        return row.Tm === teamAbbr && gameDate >= tradeDateObj;
    }).sort((a, b) => new Date(a.Data) - new Date(b.Data)); // Sort by 'Data'
}

// Calculate win percentage timeline for a team
export function calculateWinPercentageTimeline(games, teamAbbr) {
    let wins = 0, losses = 0;
    const timeline = [];
    // Group games by date first to handle multiple games per day correctly
    const gamesByDate = {};
    games.forEach(g => {
        const dateStr = g.Data.substring(0, 10);
        if (!gamesByDate[dateStr]) {
            gamesByDate[dateStr] = [];
        }
        gamesByDate[dateStr].push(g);
    });

    // Sort dates
    const sortedDates = Object.keys(gamesByDate).sort((a, b) => new Date(a) - new Date(b));

    // Process games chronologically by date
    sortedDates.forEach(dateStr => {
        // For simplicity, assume the result ('W'/'L') is consistent for a team on a given day if they played.
        // A more robust approach might need game IDs if a team played twice.
        const gameOnDate = gamesByDate[dateStr][0]; // Take the first game if multiple
        let won = gameOnDate.Res === 'W'; // Use 'Res' column for Win/Loss
        
        if (won) wins++; else losses++;
        const total = wins + losses;
        timeline.push({
            date: dateStr,
            winPct: total ? (wins / total) * 100 : 0
        });
    });

    // Deduplication might not be strictly necessary now but kept for safety
    const deduped = {};
    timeline.forEach(t => { deduped[t.date] = t.winPct; });
    return Object.entries(deduped).map(([date, winPct]) => ({ date, winPct })).sort((a, b) => new Date(a.date) - new Date(b.date));
}