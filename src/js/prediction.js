async function createPredictions(currentSeason) {

    // get the data
    const a = await fetchWithCache('bl1/' + currentSeason)

    console.table(a)

}