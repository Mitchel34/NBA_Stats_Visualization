

// Basic list of NBA teams for opponent generation
const ALL_TEAMS = [
    'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
    'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
    'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS'
];

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to generate random stats within plausible ranges
function randomStat(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates mock game data for specified teams and players between two dates.
 * @param {string} startDateStr - Start date (YYYY-MM-DD)
 * @param {string} endDateStr - End date (YYYY-MM-DD)
 * @param {Object} tradesInfo - The trades object from script.js to get player assignments.
 * @returns {Array<Object>} - Array of mock game objects.
 */
export function generateMockGames(startDateStr, endDateStr, tradesInfo) {
    const mockGames = [];
    const startDate = new Date(startDateStr + 'T00:00:00'); // Ensure parsing as local time
    const endDate = new Date(endDateStr + 'T00:00:00');
    const involvedTeams = new Set();
    const involvedPlayers = {}; // { playerName: teamAbbr }

    // Identify all teams and players involved in the trades
    Object.values(tradesInfo).forEach(trade => {
        trade.teams.forEach(team => involvedTeams.add(team));
        trade.keyPlayers.forEach(player => {
            const newTeam = Object.keys(trade.players).find(team => trade.players[team].acquired.includes(player));
            if (newTeam) {
                involvedPlayers[player] = newTeam;
            }
        });
    });

    const teamsArray = Array.from(involvedTeams);

    // Iterate through dates (roughly every 2-3 days for a game)
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        // Simulate games for each involved team
        teamsArray.forEach(team => {
            // Basic check to avoid simulating too many games
            if (Math.random() > 0.6) return; // ~40% chance of playing on a given iteration day

            const opponent = ALL_TEAMS.filter(t => t !== team)[randomStat(0, ALL_TEAMS.length - 2)];
            const gameDate = formatDate(currentDate);
            const result = Math.random() > 0.5 ? 'W' : 'L'; // Random win/loss

            // Add team-level game entry (simplified)
            mockGames.push({
                Data: gameDate,
                Tm: team,
                Opp: opponent,
                Res: result
            });

            // Add player stats for key players on this team
            Object.entries(involvedPlayers).forEach(([player, playerTeam]) => {
                if (playerTeam === team) {
                    const minutes = randomStat(20, 38); // Mock minutes
                    const fgm = randomStat(5, 15);
                    const fga = randomStat(10, 25);
                    const pts = Math.floor(fgm * 2.1 + randomStat(0, 5)); // Rough points based on FGM
                    const ft = randomStat(0, 8);
                    const fta = randomStat(0, 10);
                    const threeP = randomStat(0, 5);
                    const threePA = randomStat(1, 10);
                    const trb = randomStat(2, 12);
                    const ast = randomStat(1, 8);
                    const stl = randomStat(0, 3);
                    const blk = randomStat(0, 3);
                    const tov = randomStat(0, 5);

                    mockGames.push({
                        Player: player,
                        Tm: team,
                        Opp: opponent,
                        Res: result,
                        MP: minutes, // Use number for simplicity
                        FG: fgm,
                        FGA: fga,
                        "FG%": fga > 0 ? (fgm / fga) : 0,
                        PTS: pts,
                        Data: gameDate,
                        // Add other minimal required fields if necessary for player calculations
                        FT: ft,
                        FTA: fta,
                        "3P": threeP,
                        "3PA": threePA,
                        TRB: trb,
                        AST: ast,
                        STL: stl,
                        BLK: blk,
                        TOV: tov
                    });
                }
            });
        });

        // Increment date by 2 or 3 days
        currentDate.setDate(currentDate.getDate() + randomStat(2, 3));
    }

    console.log(`Generated ${mockGames.length} mock game records.`);
    return mockGames;
}