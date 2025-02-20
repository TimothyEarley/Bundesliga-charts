async function createPredictions(league, currentSeason) {

    let matches = []
    // get the data
    for (let yearsPast = 0; yearsPast < 3; yearsPast++) {
        // the leagueMul is a score assigned to how much 'worse' a league is
        // this is to combat the effect of a promoted team having a much better win history

        matches.push(...(await fetchWithCache('bl1/' + (currentSeason - yearsPast))).map(m => {
            return {
                ...m,
                leagueMult: 1
            }
        }))
        matches.push(...(await fetchWithCache('bl2/' + (currentSeason - yearsPast))).map(m => {
            return {
                ...m,
                leagueMult: 0.5
            }
        }))
        matches.push(...(await fetchWithCache('bl3/' + (currentSeason - yearsPast))).map(m => {
            return {
                ...m,
                leagueMult: 0.25
            }
        }))
    }

    matches = matches.sortBy(m => new Date(m.matchDateTime))
        .map(m => {
            return {
                ...extractMatchInfo(m),
                matchDateTime: m.matchDateTime,
                leagueMult: m.leagueMult
            }
        })

    // predict the current season from scratch
    // we need to predict each game from the perspective each match day,
    // otherwise later matches would have an effect on the prediction of earlier matches
    const currentSeasonMatches = await fetchWithCache(league + '/' + currentSeason)

    // Day => [Match]
    const predictedMatchesPerMatchDay = new Map();

    const dayCutoffs = currentSeasonMatches
        .groupBy(m => m.group.groupOrderID)
        .mapValues(ms => ms.map(m => new Date(m.matchDateTime)).min())       

    // Day => [Match]
    const matchesToBeUsedPerMatchDay = dayCutoffs.mapValues(date =>
        matches
            .filter(m => !m.matchIsFinished)
            .filter(m => new Date(m.matchDateTime) < date)
    )

    for (match of currentSeasonMatches) {

        const matchDay = match.group.groupOrderID;

        for (let day = 1; day <= dayCutoffs.size; day++) {
            if (!predictedMatchesPerMatchDay.has(day)) predictedMatchesPerMatchDay.set(day, [])
            
            if (day <= matchDay) {
                // predict
                const matchesSoFar = matchesToBeUsedPerMatchDay.get(day)
                const prediction = predictWithMatches(match, matchesSoFar)                
                predictedMatchesPerMatchDay.get(day).push(prediction)    
            } else {
                // real
                predictedMatchesPerMatchDay.get(day).push(extractMatchInfo(match))
            }
        }
    }

    console.table(predictedMatchesPerMatchDay.get(1).filter(m =>
        m.team1 == 'FC Bayern München' || m.team2 == 'FC Bayern München'
    ))

    // Team => [Points]
    const teams = new Map();
    for ([matchDay, matchesOnMatchDay] of predictedMatchesPerMatchDay) {
        for (match of matchesOnMatchDay) {

            if (!teams.has(match.team1)) teams.set(match.team1, Array(predictedMatchesPerMatchDay.size))
            const team1Points = teams.get(match.team1)[matchDay]
            teams.get(match.team1)[matchDay] = (team1Points ? team1Points : 0) + match.points1

            if (!teams.has(match.team2)) teams.set(match.team2, Array(predictedMatchesPerMatchDay.size))
            const team2Points = teams.get(match.team2)[matchDay]
            teams.get(match.team2)[matchDay] = (team2Points ? team2Points : 0) + match.points2
    
        }
    }

    console.log(teams);

    return teams

}

let debug = true

function predictWithMatches(match, matchesToAnalyse) {    
    // the prediction itself is very simple. Just average the past points for each team

    const previousMatchesAgainstEachOther = matchesToAnalyse.filter(m =>
        (m.team1 === match.team1.teamName || m.team2 === match.team1.teamName) &&
        (m.team1 === match.team2.teamName || m.team2 === match.team2.teamName)
    )
    const avgPointsTeam1 = previousMatchesAgainstEachOther.map(m =>
        match.team1.teamName == m.team1 ? m.points1 : m.points2
    ).sum() / previousMatchesAgainstEachOther.length

    const avgPointsTeam2 = previousMatchesAgainstEachOther.map(m =>
        match.team2.teamName == m.team1 ? m.points1 : m.points2
    ).sum() / previousMatchesAgainstEachOther.length


    const previousMatchesTeam1 = matchesToAnalyse.filter(m =>
        (m.team1 === match.team1.teamName || m.team2 === match.team1.teamName)
    ).slice(-10)
    const avgPointsTeam1AnyMatch = previousMatchesTeam1.map(m =>
        (match.team1.teamName == m.team1 ? m.points1 : m.points2) * m.leagueMult
    ).sum() / previousMatchesTeam1.length

    const previousMatchesTeam2 = matchesToAnalyse.filter(m =>
        (m.team1 === match.team2.teamName || m.team2 === match.team2.teamName)
    ).slice(-10)
    const avgPointsTeam2AnyMatch = previousMatchesTeam2.map(m =>
        (match.team2.teamName == m.team1 ? m.points1 : m.points2) * m.leagueMult
    ).sum() / previousMatchesTeam2.length

    if (debug && match.team1.teamName == 'Holstein Kiel') {
        console.log(match);
        console.log(previousMatchesTeam1);
        debug = false
    }


    const distanceDraw = 0.1 // this value is set by trying to get % draws to 23%. The higher the more draws.
    const exactMatchScore = 1 // how to weight the exact matches. 1 is same, higher is higher

    const score1 = avgPointsTeam1 * exactMatchScore + avgPointsTeam1AnyMatch
    const score2 = avgPointsTeam1 * exactMatchScore + avgPointsTeam2AnyMatch


    if (score1 > score2 + distanceDraw) {
        predictionPointsTeam1 = 3
        predictionPointsTeam2 = 0
    } else if (score2 > score1 + distanceDraw) {
        predictionPointsTeam1 = 0
        predictionPointsTeam2 = 3
    } else {
        predictionPointsTeam1 = 1
        predictionPointsTeam2 = 1
    }
    

    return {
        team1: match.team1.teamName,
        team2: match.team2.teamName,
        points1: predictionPointsTeam1,
        points2: predictionPointsTeam2,
        isPrediction: true
    }
}