
optionsPoints = {
  title: text: ''
  chart:
    renderTo: 'points_chart'
    type: 'line'
  xAxis: title: text: 'Match #'
  yAxis: title: text: 'Points'
  legend:
    layout: 'vertical'
    align: 'right'
  series: []
}

optionsPointsPercent = {
  title: text: ''
  tooltip: valueSuffix: '%'
  chart:
    renderTo: 'points_percent_chart'
    type: 'line'
  xAxis: title: text: 'Match #'
  yAxis: title: text: '% Points'
  legend:
    layout: 'vertical'
    align: 'right'
  series: []
}

$.getJSON 'http://www.openligadb.de/api/getmatchdata/bl1/2015', (matchArray) ->

  teams = []

  for match in matchArray
    team1 = match.Team1.TeamName
    team2 = match.Team2.TeamName
    result = match.MatchResults[1]
    if (!result)
      continue
    goalsTeam1 = result.PointsTeam1
    goalsTeam2 = result.PointsTeam2
    # get the points
    if goalsTeam1 > goalsTeam2
      pointsTeam1 = 3
      pointsTeam2 = 0
    else if goalsTeam2 > goalsTeam1
      pointsTeam1 = 0
      pointsTeam2 = 3
    else
      pointsTeam1 = 1
      pointsTeam2 = 1
    # Create new team if empty
    if (!teams[team1])
      teams[team1] = []
    else
      pointsTeam1 += teams[team1][teams[team1].length - 1]
    if (!teams[team2])
      teams[team2] = []
    else
      pointsTeam2 += teams[team2][teams[team2].length - 1]
    teams[team1].push pointsTeam1
    teams[team2].push pointsTeam2

  # TODO sort, then map to positionin table for given day
  # Set data points'for points
  for team, points of teams
    optionsPoints.series.push {
      name: team
      data: points
    }
    game = 0
    optionsPointsPercent.series.push {
      name: team
      data: points.map (p) ->
        game++
        return p / (game * 3) * 100
    }
  new Highcharts.Chart(optionsPoints)
  new Highcharts.Chart(optionsPointsPercent)
