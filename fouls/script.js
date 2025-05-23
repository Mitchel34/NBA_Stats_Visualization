
//Make BY team scatterplots to see total fouls for eacch player??

document.addEventListener("DOMContentLoaded", function () {
    //filePath
    const csvFilePath = "../data/database_24_25.csv";

    const foulsSection = document.querySelector("#fouls");

    const plotContainer = document.createElement("div");
    plotContainer.id = "plot";
    plotContainer.style.height = "600px";

    // Wrapper for the bottom section so they are side by side
    const bottomSection = document.createElement("div");
    bottomSection.id = "bottomSection";

    const playerInfoBox = document.createElement("div");
    playerInfoBox.id = "playerInfo";

    const playerPlot = document.createElement("div");
    playerPlot.id = "playerPlot";

    // Assemble everything
    bottomSection.appendChild(playerInfoBox);
    bottomSection.appendChild(playerPlot);

    foulsSection.appendChild(plotContainer);
    foulsSection.appendChild(bottomSection);
  
    Plotly.d3.csv(csvFilePath, function (err, rows) {
      if (err) {
        console.error("CSV Load Error:", err);
        return;
      }
  
      const teamStats = {};
      const playerFoulsByTeam = {};
  
      // Team & Player Data
      rows.forEach(row => {
        const team = row.Tm;
        const player = row.Player;
        const fouls = +row.PF;
        const isWin = row.Res === "W";
  
        if (!teamStats[team]) {
          teamStats[team] = { totalFouls: 0, games: 0, wins: 0 };
          playerFoulsByTeam[team] = {};
        }
  
        teamStats[team].totalFouls += fouls;
        teamStats[team].games += 1;
        if (isWin) teamStats[team].wins += 1;
  
        if (!playerFoulsByTeam[team][player]) {
          playerFoulsByTeam[team][player] = 0;
        }
        playerFoulsByTeam[team][player] += fouls;
      });
  
      const teams = Object.keys(teamStats);
      const avgFouls = teams.map(team => teamStats[team].totalFouls / teamStats[team].games);
      const winPercents = teams.map(team => teamStats[team].wins / teamStats[team].games);
  
      //Making it be colored by team
      const colors = teams.map((_, i) =>
        `hsl(${(360 * i) / teams.length}, 70%, 50%)`
      );
      //Created so the 2nd scatterplot will have the same colors
      const teamColorMap = {};
        teams.forEach((team, i) => {
        teamColorMap[team] = colors[i];
      });

      
      const trace = {
        x: avgFouls,
        y: winPercents,
        text: teams,
        mode: "markers+text",
        type: "scatter",
        textposition: "top center",
        marker: {
          size: 12,
          color: colors
        },
        name: "Teams"
      };
  
      // Make Trend line
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
        yaxis: { 
          title: "Win Percentage", 
          tickformat: ".0%", 
          range: [0, 1],
          titlefont: {
            size: 18, 
            family: 'Georgia'
          }
        },
        font: {
          family: 'Georgia',
          size: 14
        }
      };
  
      Plotly.newPlot("plot", [trace, trendLine], layout);
  
      // Click Event
      document.getElementById("plot").on("plotly_click", function (data) {
        const teamClicked = data.points[0].text;
        const teamColor = teamColorMap[teamClicked];
        const playerEntries = Object.entries(playerFoulsByTeam[teamClicked])
          .sort((a, b) => b[1] - a[1]);
      
        const playerNames = playerEntries.map(([player]) => player);
        const foulCounts = playerEntries.map(([_, fouls]) => fouls);
      
        playerInfoBox.innerHTML = `
          <h3>Players with Fouls for ${teamClicked}</h3>
          <ul>${playerEntries.map(([p, f]) => `<li>${p}: ${f} fouls</li>`).join("")}</ul>
        `;
      
        const playerTrace = {
          x: playerNames,
          y: foulCounts,
          type: "scatter",
          mode: "markers+text",
          text: foulCounts.map(f => `${f} fouls`),
          textposition: "top center",
          marker: {
            color: teamColor,
            size: 10
          },
          hovertemplate: '%{x}: %{y} fouls<extra></extra>' 
        };
      
        const playerLayout = {
          title: `Fouls by Player (${teamClicked})`,
          xaxis: { title: "Player", automargin: true },
          yaxis: { title: "Total Fouls" },
          margin: { b: 100 },
          font: { family: 'Georgia', size: 12 }
        };
      
        Plotly.newPlot("playerPlot", [playerTrace], playerLayout);
      });
      ;
      });
    });
  