// Fouls page specific JavaScript 

// document.addEventListener('DOMContentLoaded', () => {
//     console.log('Fouls Page Loaded');
//     // Fouls visualization code will go here
    
//     // Initialize any Fouls page specific functionality
//     initFoulsPage();
// });

// function initFoulsPage() {
//     // Add your Fouls page initialization code here
//     // This is a placeholder for future development
// }

document.addEventListener("DOMContentLoaded", function () {
    const csvFilePath = "../data/database_24_25.csv"; // adjust path if needed
  
    const plotContainer = document.createElement("div");
    plotContainer.id = "plot";
    plotContainer.style.height = "600px";
    document.querySelector("#fouls").appendChild(plotContainer);
  
    Plotly.d3.csv(csvFilePath, function (err, rows) {
      if (err) {
        console.error("CSV Load Error:", err);
        return;
      }
  
      const teamStats = {};
  
      // Aggregate data per team
      rows.forEach(row => {
        const team = row.Tm;
        const fouls = +row.PF;
        const isWin = row.Res === "W";
  
        if (!teamStats[team]) {
          teamStats[team] = { totalFouls: 0, games: 0, wins: 0 };
        }
  
        teamStats[team].totalFouls += fouls;
        teamStats[team].games += 1;
        if (isWin) teamStats[team].wins += 1;
      });
  
      const teams = Object.keys(teamStats);
      const avgFouls = teams.map(team => teamStats[team].totalFouls / teamStats[team].games);
      const winPercents = teams.map(team => teamStats[team].wins / teamStats[team].games);
  
      const trace = {
        x: avgFouls,
        y: winPercents,
        text: teams,
        mode: "markers+text",
        type: "scatter",
        textposition: "top center",
        marker: {
          size: 12,
          color: "royalblue"
        },
        name: "Teams"
      };
  
      // Calculate linear regression for trend line
      const n = avgFouls.length;
      const xMean = avgFouls.reduce((a, b) => a + b, 0) / n;
      const yMean = winPercents.reduce((a, b) => a + b, 0) / n;
  
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (avgFouls[i] - xMean) * (winPercents[i] - yMean);
        den += (avgFouls[i] - xMean) ** 2;
      }
      const slope = num / den;
      const intercept = yMean - slope * xMean;
  
      const xMin = Math.min(...avgFouls);
      const xMax = Math.max(...avgFouls);
  
      const trendLine = {
        x: [xMin, xMax],
        y: [slope * xMin + intercept, slope * xMax + intercept],
        mode: "lines",
        type: "scatter",
        line: {
          color: "black",
          width: 2,
          dash: "dash"
        },
        name: "Trend Line"
      };
  
      const layout = {
        title: "Do Team Fouls Affect Win Rate?",
        xaxis: { title: "Average Fouls per Game" },
        yaxis: { title: "Win Percentage", tickformat: ".0%", range: [0, 1] },
      };
  
      Plotly.newPlot("plot", [trace, trendLine], layout);
    });
  });
  