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
        const gameDate = new Date(row.GAME_DATE_EST?.substring(0, 10));
        const isHome = row.TEAM_ABBREVIATION_HOME === teamAbbr && row.PLAYER_NAME_HOME === playerName;
        const isAway = row.TEAM_ABBREVIATION_AWAY === teamAbbr && row.PLAYER_NAME_AWAY === playerName;
        return (isHome || isAway) && gameDate >= tradeDateObj;
    });
}

// Calculate player stats (PPG, MPG, FG%, games played)
export function calculatePlayerStats(games) {
    let totalPts = 0, totalMin = 0, totalFGM = 0, totalFGA = 0;
    let gamesPlayed = games.length;
    games.forEach(g => {
        totalPts += g.PTS || 0;
        let min = 0;
        if (typeof g.MIN === 'string' && g.MIN.includes(':')) {
            const parts = g.MIN.split(':');
            min = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
        } else if (typeof g.MIN === 'number') {
            min = g.MIN;
        }
        totalMin += min;
        totalFGM += g.FGM || 0;
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
        const gameDate = new Date(row.GAME_DATE_EST?.substring(0, 10));
        return (row.TEAM_ABBREVIATION_HOME === teamAbbr || row.TEAM_ABBREVIATION_AWAY === teamAbbr) && gameDate >= tradeDateObj;
    }).sort((a, b) => new Date(a.GAME_DATE_EST) - new Date(b.GAME_DATE_EST));
}

// Calculate win percentage timeline for a team
export function calculateWinPercentageTimeline(games, teamAbbr) {
    let wins = 0, losses = 0;
    const timeline = [];
    games.forEach(g => {
        let won = false;
        if (g.TEAM_ABBREVIATION_HOME === teamAbbr && g.WL_HOME === 'W') won = true;
        if (g.TEAM_ABBREVIATION_AWAY === teamAbbr && g.WL_AWAY === 'W') won = true;
        if (won) wins++; else losses++;
        const total = wins + losses;
        timeline.push({
            date: g.GAME_DATE_EST.substring(0, 10),
            winPct: total ? (wins / total) * 100 : 0
        });
    });
    // Deduplicate by date, keep last entry per date
    const deduped = {};
    timeline.forEach(t => { deduped[t.date] = t.winPct; });
    return Object.entries(deduped).map(([date, winPct]) => ({ date, winPct })).sort((a, b) => new Date(a.date) - new Date(b.date));
}