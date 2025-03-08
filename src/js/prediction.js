const eloDivider = 480

async function createPredictions(league, currentSeason) {
    let matches = []
    // get the data
    for (let yearsPast = 0; yearsPast < 5; yearsPast++) {
        matches.push(...(await fetchWithCache('bl1/' + (currentSeason - yearsPast))))
        matches.push(...(await fetchWithCache('bl2/' + (currentSeason - yearsPast))))
        matches.push(...(await fetchWithCache('bl3/' + (currentSeason - yearsPast))))
    }

    matches = matches
        .filter(m => m.team1.teamName && m.team2.teamName && m.matchResults.length > 0) // some missing data
        .sortBy(m => new Date(m.matchDateTime))
        .map(m => {
            return {
                ...extractMatchInfo(m),
                matchDateTime: new Date(m.matchDateTime)
            }
        })


    const elo = new Map();
    for (match of matches) {
        elo.set(match.team1, 1000)
        elo.set(match.team2, 1000)
    }

    const historicElo = new Map();
    for (team of elo.keys()) {
        historicElo.set(team, [])
    }

    for (match of matches) {
        if (match.points1 != 0 && match.points1 != 1 && match.points1 != 3)
            console.log("Error: ", match)

        const new1 = getNewRating(elo.get(match.team1), elo.get(match.team2), match.points1)
        const new2 = getNewRating(elo.get(match.team2), elo.get(match.team1), match.points2)

        elo.set(match.team1, new1)
        elo.set(match.team2, new2)

        historicElo.get(match.team1).push({
            elo: new1,
            date: match.matchDateTime
        })
        historicElo.get(match.team2).push({
            elo: new2,
            date: match.matchDateTime
        })
    }
    console.table(elo.toArray().sortBy(x => -x[1]))

    // predict the current season from scratch
    // we need to predict each game from the perspective each match day,
    // otherwise later matches would have an effect on the prediction of earlier matches
    const currentSeasonMatches = await fetchWithCache(league + '/' + currentSeason)

    const dayCutoffs = currentSeasonMatches
        .groupBy(m => m.group.groupOrderID)
        .mapValues(ms => ms.map(m => new Date(m.matchDateTime)).min())       

    // Day => [Match]
    const predictedMatchesPerMatchDay = new Map();

    for (match of currentSeasonMatches) {

        const matchDay = match.group.groupOrderID;

        for (let day = 1; day <= dayCutoffs.size; day++) {
            if (!predictedMatchesPerMatchDay.has(day)) predictedMatchesPerMatchDay.set(day, [])
            if (day < matchDay || ! match.matchIsFinished) {
                // predict
                const prediction = predictWithHistoricElo(match, historicElo, dayCutoffs.get(day))
                predictedMatchesPerMatchDay.get(day).push(prediction)
            } else {
                // real
                predictedMatchesPerMatchDay.get(day).push(extractMatchInfo(match))
            }
        }
    }

    // Team => [Points]
    const teams = new Map();
    for ([matchDay, matchesOnMatchDay] of predictedMatchesPerMatchDay) {

        const matchDayIndex = matchDay - 1

        for (match of matchesOnMatchDay) {

            if (!teams.has(match.team1)) teams.set(match.team1, Array(predictedMatchesPerMatchDay.size))
            const team1Points = teams.get(match.team1)[matchDayIndex]
            teams.get(match.team1)[matchDayIndex] = (team1Points ? team1Points : 0) + match.points1

            if (!teams.has(match.team2)) teams.set(match.team2, Array(predictedMatchesPerMatchDay.size))
            const team2Points = teams.get(match.team2)[matchDayIndex]
            teams.get(match.team2)[matchDayIndex] = (team2Points ? team2Points : 0) + match.points2

        }
    }

    return teams

}

// https://en.wikipedia.org/wiki/Elo_rating_system#Theory
function getNewRating(myRating, opponentRating, myPoints) {
    const K = 32

    const actual = myPoints == 3 ? 1 : myPoints / 2
    const qb = Math.pow(10, opponentRating / eloDivider)
    const qa = Math.pow(10, myRating / eloDivider)
    const expected = qa / (qa + qb)

    const delta = K * (actual - expected)

    return myRating + delta
}

function expectedPoints(myElo, opponentElo) {
    const winRate = (1 / (1 + Math.pow(10, (opponentElo - myElo) / eloDivider)))

    // we need to rescale the 0..1 winRate to points from 0 to 3
    // we have three fixed points for winRate to points (0 => 0, 0.5 => 1, 1 => 3) and
    // together with fixing the end slopes to 0 we get a quadratic

    return -8 * Math.pow(winRate, 4) + 10 * Math.pow(winRate, 3) + Math.pow(winRate, 2)
}

function predictWithHistoricElo(match, historicElo, cutoff) {
    const elosTeam1 = historicElo.get(match.team1.teamName)
    const elosTeam2 = historicElo.get(match.team2.teamName)

    const team1EloIndex = elosTeam1.findIndex(entry => entry.date > cutoff)
    const team2EloIndex = elosTeam2.findIndex(entry => entry.date > cutoff)

    const team1Elo = team1EloIndex > 0 ? elosTeam1[team1EloIndex - 1].elo : elosTeam1[elosTeam1.length - 1].elo
    const team2Elo = team2EloIndex > 0 ? elosTeam2[team2EloIndex - 1].elo : elosTeam2[elosTeam2.length - 1].elo


    return {
        team1: match.team1.teamName,
        team2: match.team2.teamName,
        points1: expectedPoints(team1Elo, team2Elo),
        points2: expectedPoints(team2Elo, team1Elo),
        isPrediction: true
    }
}