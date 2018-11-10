loadSeason();

function loadSeason() {
  const season = document.getElementById("season").value;
  const league = document.getElementById("league").value;

  const url = "https://www.openligadb.de/api/getmatchdata/" + league + "/" + season

  const optionsPoints = {
    title: { text: '' },
    chart: {
      renderTo: 'points_chart',
      type: 'line'
    },
    xAxis: { title: {text: 'Match #'} },
    yAxis: { title: {text: 'Points'} },
    legend: {
      layout: 'vertical',
      align: 'right'
    },
    series: []
  };

  const optionsPointsPercent = {
    title: { text: '' },
    tooltip: { valueSuffix: '%' },
    chart: {
      renderTo: 'points_percent_chart',
      type: 'line'
    },
    xAxis: { title: {text: 'Match #'} },
    yAxis: { title: {text: '% Points'} },
    legend: {
      layout: 'vertical',
      align: 'right'
    },
    series: []
  };

  const optionsPlacePercent = {
    title: { text: '' },
    tooltip: { valueSuffix: '.' },
    chart: {
      renderTo: 'place_percent_chart',
      type: 'line'
    },
    xAxis: { title: {text: 'Match #'} },
    yAxis: { title: {text: '% of points of 1. place'} },
    legend: {
      layout: 'vertical',
      align: 'right'
    },
    series: []
  };

  const optionsPlace = {
    title: { text: '' },
    tooltip: { valueSuffix: '.' },
    chart: {
      renderTo: 'place_chart',
      type: 'line'
    },
    xAxis: { title: {text: 'Match #'} },
    yAxis: {
      title: { text: 'Place'
    },
      reversed: true,
      categories: [0,  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,  11,  12,  13,  14,  15,  16,  17]
    },
    legend: {
      layout: 'vertical',
      align: 'right'
    },
    series: []
  };

  // clear old data first
  new Highcharts.Chart(optionsPlace);
  new Highcharts.Chart(optionsPoints);
  new Highcharts.Chart(optionsPointsPercent);
  new Highcharts.Chart(optionsPlacePercent)

  function pointsFromGoals(goals1, goals2) {
    if (goals1 > goals2) return [3, 0]
    else if (goals1 < goals2) return [0, 3]
    else return [1, 1]
  }

  function statsFromMatch(match) {
    const result = match.MatchResults
      .find(r => r.ResultName === "Endergebnis");

    if (!result) return null

    const goalsTeam1 = result.PointsTeam1;
    const goalsTeam2 = result.PointsTeam2;

    const [pointsTeam1, pointsTeam2] = pointsFromGoals(goalsTeam1, goalsTeam2);

    return {
      'team1': match.Team1.TeamName,
      'team2': match.Team2.TeamName,
      'pointsTeam1': pointsTeam1,
      'pointsTeam2': pointsTeam2
    }
  }

  function mergeMatches(acc, stats) {
    fillTeam(acc, stats.team1, stats.pointsTeam1)
    fillTeam(acc, stats.team2, stats.pointsTeam2)
    return acc;
  }

  function fillTeam(map, teamName, points) {
    if (!map.get(teamName)) {
        map.set(teamName, [points]);
    } else {
      map.get(teamName).push(points);
    }

  }

  console.log("Getting: " + url);

  $.getJSON(url, (data) => {
    console.log("Crunching data...");

    const teamPoints = data
      .map(match => statsFromMatch(match))
      .filter(stats => !!stats)
      .reduce((acc, stats) => mergeMatches(acc, stats), new Map());

      const teams = teamPoints.size;

      // [{name: String, data: [Int]}]
    const teamSummedPoints = Array.from(teamPoints.entries())
      .map(([team, points]) => { return {
        name: team,
        data: points.reduce((acc, next) => {
          acc.push(acc[acc.length - 1] + next)
          return acc
        }, [0])
      }});

    optionsPoints.series = teamSummedPoints;

    optionsPointsPercent.series = teamSummedPoints.map( entry => {
      return {
        name: entry.name,
        data: entry.data.map((p, i) => p / (i * 3) * 100)
      }
    });

    const matches = teamSummedPoints.reduce((acc, entry) => {
      //entry: {name: String, data: [Int]}
      entry.data.reduce((matchDay, points) => {
        while (!acc[matchDay]) acc.push(new Map());
        acc[matchDay].set(entry.name, points);
        return matchDay+1;
      }, 0);
      return acc;
    }, []);

    const maxPointsPerMatchDay = matches
      .map( match => Math.max(...Array.from(match.values())));

    const placement = matches.reduce((acc, match) => {
      Array.from(match.entries())
        .sort((a, b) => a[1] - b[1])
        .forEach(([team, points], place) => {
          if (!acc.get(team)) acc.set(team, [])
          acc.get(team).push(teams - place);
        });
        return acc;
    }, new Map());

    optionsPlace.series = Array.from(placement.entries()).map(([team, places]) => {
      return {
        name: team,
         // dont include zeroth match
        data: places.map((place, i) => {
          if (i == 0) return NaN
          else return place
        })
      }
    });

    optionsPlacePercent.series = teamSummedPoints.map( entry => {
      return {
        name: entry.name,
        data: entry.data.map(
          (points, matchDay) => 100 * points / maxPointsPerMatchDay[matchDay]
        )
      }
    });

    new Highcharts.Chart(optionsPlace)
    new Highcharts.Chart(optionsPoints);
    new Highcharts.Chart(optionsPointsPercent);
    new Highcharts.Chart(optionsPlacePercent)
  });
}
