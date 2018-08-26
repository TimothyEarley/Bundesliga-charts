
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

optionsPlacePercent = {
  title: text: ''
  tooltip: valueSuffix: '.'
  chart:
    renderTo: 'place_percent_chart'
    type: 'line'
  xAxis: title: text: 'Match #'
  yAxis: title: text: '% of points of 1. place'
  legend:
    layout: 'vertical'
    align: 'right'
  series: []
}

optionsPlace = {
  title: text: ''
  tooltip: valueSuffix: '.'
  chart:
    renderTo: 'place_chart'
    type: 'line'
  xAxis: title: text: 'Match #'
  yAxis:
    title: text: 'Place'
    reversed: true
    categories: [0,  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,  11,  12,  13,  14,  15,  16,  17]
  legend:
    layout: 'vertical'
    align: 'right'
  series: []
}

$.getJSON 'https://www.openligadb.de/api/getmatchdata/bl1/2018', (matchArray) ->

  teams = [] # [team: [match: points]]

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

  maxPoints = []

  for team, points of teams
    match = 0
    for p in points
      if !maxPoints[match]
        maxPoints[match] = 0
      if p > maxPoints[match]
        maxPoints[match] = p
      match++

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
    game = 0
    optionsPlacePercent.series.push {
      name: team
      data: points.map (p) ->
        p / (maxPoints[game++])
    }


  # [teams: [points]] -> [match: [team: points]]
  matches = []
  for team, points of teams
    game = 0
    for p in points
      if !matches[game]
        matches[game] = []
      matches[game++][team] = p

  # [match: [team: points]] -> [teams: [position]]
  positions = []
  matchNum = 0
  for match in matches
    position = 1
    max = {team: '', points: 0}
    while (max.points != -1)
      max.points = -1
      for team, points of match
        if points > max.points
          max.points = points
          max.team = team
      if !positions[max.team]
        positions[max.team] = []
      positions[max.team][matchNum] = position++
      match[max.team] = -1
    matchNum++

  for team, pos of positions
    optionsPlace.series.push {
      name: team
      data: pos.map (p) ->
        if p == 19 # (temp) fix for weird glitch
          18
        else
          p
    }

  new Highcharts.Chart(optionsPoints)
  new Highcharts.Chart(optionsPointsPercent)
  new Highcharts.Chart(optionsPlacePercent)
  new Highcharts.Chart(optionsPlace)
