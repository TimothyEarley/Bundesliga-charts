async function createPredictions(league, currentSeason) {

    let matches = []
    // get the data
    for (let yearsPast = 0; yearsPast < 3; yearsPast++) {
        matches.push(...await fetchWithCache('bl1/' + (currentSeason - yearsPast)))
        matches.push(...await fetchWithCache('bl2/' + (currentSeason - yearsPast)))
        matches.push(...await fetchWithCache('bl3/' + (currentSeason - yearsPast)))
    }

    matches = matches.sortBy(m => new Date(m.matchDateTime))

    // predict the current season from scratch
    const currentSeasonMatches = await fetchWithCache(league + '/' + currentSeason)

    let draws = 0
    let total = 0
    const predictedMatches = currentSeasonMatches.map(match => {

        // the prediction itself is very simple. Just average the past points for each

        const matchesSoFar = matches
            .filter(m => m.matchIsFinished)
            .filter(m => {
                return new Date(m.matchDateTime) < new Date(match.matchDateTime)
            })
            .map(extractMatchInfo)

        const previousMatchesAgainstEachOther = matchesSoFar.filter(m =>
            (m.team1 === match.team1.teamName || m.team2 === match.team1.teamName) &&
            (m.team1 === match.team2.teamName || m.team2 === match.team2.teamName)
        )
        const avgPointsTeam1 = previousMatchesAgainstEachOther.map(m =>
            match.team1.teamName == m.team1 ? m.points1 : m.points2
        ).sum() / previousMatchesAgainstEachOther.length

        const avgPointsTeam2 = previousMatchesAgainstEachOther.map(m =>
            match.team2.teamName == m.team1 ? m.points1 : m.points2
        ).sum() / previousMatchesAgainstEachOther.length


        const previousMatchesTeam1 = matchesSoFar.filter(m =>
            (m.team1 === match.team1.teamName || m.team2 === match.team1.teamName)
        ).slice(-10)
        const avgPointsTeam1AnyMatch = previousMatchesTeam1.map(m =>
            match.team1.teamName == m.team1 ? m.points1 : m.points2
        ).sum() / previousMatchesTeam1.length

        const previousMatchesTeam2 = matchesSoFar.filter(m =>
            (m.team1 === match.team2.teamName || m.team2 === match.team2.teamName)
        ).slice(-10)
        const avgPointsTeam2AnyMatch = previousMatchesTeam2.map(m =>
            match.team2.teamName == m.team1 ? m.points1 : m.points2
        ).sum() / previousMatchesTeam2.length

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
            draws++
        }
        total++

        return {
            ...match,
            predictionPointsTeam1,
            predictionPointsTeam2
        }
    })

    // comment this back in to adjust distanceDraw
    // console.log("Draws: %s, Total: %s. %s Percent", draws, total, 100 * draws / total)

    // uncomment to show all predictions
    /*
    console.table(predictedMatches.map(m => {
        return {
            day: m.group.groupOrderID,
            team1: m.team1.teamName,
            team2: m.team2.teamName,
            predictionPointsTeam1: m.predictionPointsTeam1,
            predictionPointsTeam2: m.predictionPointsTeam2
        }
    }))
    */

    // Team => Day => Points (real & predicted)
    const teams = new Map();
    for (match of predictedMatches) {
        const info = extractMatchInfo(match);
        const day = match.group.groupOrderID;

        if (!teams.has(info.team1)) teams.set(info.team1, new Map());
        if (!teams.has(info.team2)) teams.set(info.team2, new Map());

        teams.get(info.team1).set(day, {
            points: info.points1,
            predicted: match.predictionPointsTeam1
        })
        teams.get(info.team2).set(day, {
            points: info.points2,
            predicted: match.predictionPointsTeam2
        })
    }

    // Team => [Points]
    const teamPoints = sortMatchdays(teams);

    // Team => [Points predicated till end]
    const totalTeamPoints = teamPoints.mapValues(ps => ps.map((_, thisIndex) => {
        // sum all previous real points and future predictions
        let sum = 0;
        for (let i = 0; i < ps.length; i++) {
            // we calculate more than is actually used. The chart only goes until the current match day
            if (i <= thisIndex && ps[i].points !== undefined) {
                sum += ps[i].points;
            } else {
                sum += ps[i].predicted;
            }
        }
        return sum;
    }
    ))


    return totalTeamPoints

}