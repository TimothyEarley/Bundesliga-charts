// https://www.bundesliga-prognose.de/{liga}/{jahr}/{spieltag}/
const prognoseURL = "https://www.bundesliga-prognose.de/"

var prognoseCache = new Map();


async function fetchPrognose(league, season) {
    const cacheKey = league + "/" + season
    if (prognoseCache.has(cacheKey)) {
        console.log('Cached Prognose ' + cacheKey)
        return prognoseCache.get(cacheKey)
    }
    console.log('Fetching Prognose')

    const leagueNumber = league.replace('bl', '')
    const matchDays = 34
    const parser = new DOMParser()
    let results = []
    for (let day = 1; day <= matchDays; day++) {
        const fullURL = corsProxy + encodeURIComponent(prognoseURL + leagueNumber + "/" + season + "/" + day)
        const result = await fetchWithRetry(fullURL)
        const el = parser.parseFromString(await result.text(), 'text/html')
        const table = el.getElementsByClassName('table')[1]
        const rows = table.getElementsByTagName('tbody')[0]
            .getElementsByTagName('tr')
        const matchRows = Array.prototype.slice.call( rows ).filter(r => ! r.id.startsWith('span_details'))
        const matches = matchRows.map(r => {
            const [date, time, home, _1, away, _2, actual, expected] = r.getElementsByTagName('td')
            const [actualGoalsHome, actualGoalsAway] = actual.innerText.split(':')
            const [expectedGoalsHome, expectedGoalsAway] = expected.innerText.split(':')
            let [expectedPointsHome, expectedPointsAway] = pointsFromScore(
                parseInt(expectedGoalsHome),
                parseInt(expectedGoalsAway)
            )
            let [actualPointsHome, actualPointsAway] = pointsFromScore(
                parseInt(actualGoalsHome),
                parseInt(actualGoalsAway)
            )
            const hasActual = actualGoalsHome.trim() !== ""
            return {
                home: home.innerText.trim(),
                away: away.innerText.replace('- ', '').trim(),
                actualGoalsHome,
                actualGoalsAway,
                expectedGoalsHome,
                expectedGoalsAway,
                expectedPointsHome,
                expectedPointsAway,
                actualPointsHome,
                actualPointsAway,
                hasActual
            }
        })
        results.push(matches)
    }

    prognoseCache.set(cacheKey, results)
    return results
}

async function prognoseToTable(league, season) {

    const matchDays = await fetchPrognose(league, season)

    const expectedPoints = new Map()
    matchDays.forEach((matchDay) => {
        matchDay.forEach((match) => {
            expectedPoints.set(match.home, match.expectedPointsHome + (expectedPoints.get(match.home) || 0))
            expectedPoints.set(match.away, match.expectedPointsAway + (expectedPoints.get(match.away) || 0))
        })
    })

    // Day => Team => Points
    const actualOverlay = matchDays.runningFold(expectedPoints, (current, day) => {
        const newMap = new Map(current)
        day.forEach(match => {
            if (match.hasActual) {
                newMap.set(match.home, newMap.get(match.home) + match.actualPointsHome - match.expectedPointsHome)
                newMap.set(match.away, newMap.get(match.away) + match.actualPointsAway - match.expectedPointsAway)
            }
        })
        return newMap
    })

    // Team => Points[]
    const teamPoints = new Map()
    actualOverlay.forEach((map) =>{
        map.forEach((v, k) => {
            const prev = teamPoints.get(k) || []
            teamPoints.set(k, [...prev, v])
        })
    })

    const labels = Array.from(Array(34), (_, i) => i + 1);
    charts.push(chartIt("prognose", teamPoints, labels, 0, false))
}