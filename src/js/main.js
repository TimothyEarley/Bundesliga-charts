// to destroy them when reloading
var charts = [];

// simple cache to avoid calling the API with same parameters, does not persist
// also no fancy debouncing. TODO cache the computations
var cache = new Map();

const corsProxy = "https://corsproxy.io/?"
const apiURL = "https://www.openligadb.de/api/getmatchdata/"

async function fetchWithCache(url) {
	if (cache.has(url)) {
		console.log("Cached: " + url)
		return cache.get(url);
	} else {
		console.log("Fetching: " + url)
		const fullUrl = corsProxy + encodeURIComponent(apiURL + url)
		const result = await fetch(fullUrl);
		const data = await result.json();
		cache.set(url, data);
		return data;
	}
}

async function fetchData(league, season) {
	const url = league + "/" + season;
	const result = await fetchWithCache(url);
	const matches = result.filter(m => m.matchIsFinished);

	// Day => Matches
	const matchdays = matches.groupBy(m => m.group.groupOrderID)

	// Team => Day => Points
	const teams = groupMatchesByTeam(matchdays);
	const teamCount = teams.size;

	// Team => [Points]
	const teamPoints = sortMatchdays(teams);

	// Team => [Acc Points]
	const accTeamPoints = teamPoints.mapValues(ps => ps.reduce((acc, p) => {
		if (acc.length == 0) acc.push(p)
		else acc.push(p + acc[acc.length - 1]);
		return acc;
	}, []));


	const matchdayCount = Math.max(...matches.map(m => m.group.groupOrderID), 0);
	// console.log("Match days with data: " + matchdayCount);
	const labels = Array.from(Array(matchdayCount), (_, i) => i + 1);


	// Acc Points => % Points
	const percentTeamPoints = accTeamPoints.mapValues(ps => ps.map((p, i) => p / (3 * (i + 1))));

	// Day => Table
	const table = Array.from(Array(matchdayCount), (_, i) => {
		const order = Array.from(accTeamPoints.mapValues(a => a[i]))
			// elements are lists of [team, points]
			.sort((a, b) => b[1] - a[1])
			.map(x => x[0]);
		return order;
	});

	// Team => [Place]
	const placement = teams.mapValues((team, _) => {
		return table.map(order => {
			return order.indexOf(team) + 1;
		});
	});

	charts.forEach(c => {
		c.destroy()
	});


	charts.push(chartIt("pointChart", accTeamPoints, labels, 3, false));
	charts.push(chartIt("percentChart", percentTeamPoints, labels, 0, false));
	charts.push(chartIt("place", placement, labels, 0, true));
}

function groupMatchesByTeam(matchdays) {
	const teams = new Map();

	for ([day, matchesOnDay] of matchdays) {
		for (match of matchesOnDay) {
			const info = extractMatchInfo(match);
			if (!info) continue;
			if (!teams.has(info.team1)) teams.set(info.team1, new Map());
			teams.get(info.team1).set(day, info.points1);
			if (!teams.has(info.team2)) teams.set(info.team2, new Map());
			teams.get(info.team2).set(day, info.points2);
		}
	}

	return teams;
}

function sortMatchdays(teams) {
	return teams.mapValues(days =>
		days.toArray().sortBy(([day, _]) => day).map(([_, p]) => p)
	);
}

function extractMatchInfo(match) {
	if (!match.matchResults[0]) {
		console.log("No match data!", match);
		return null;
	}
	const result = match.matchResults.find((result) => result.resultName == "Endergebnis");
	const goals1 = result.pointsTeam1;
	const goals2 = result.pointsTeam2;

	var points1, points2;
	if (goals1 > goals2) {
		points1 = 3;
		points2 = 0;
	} else if (goals1 < goals2) {
		points1 = 0;
		points2 = 3;
	} else {
		points1 = 1;
		points2 = 1;
	}

	return {
		team1: match.team1.teamName,
		points1: points1,
		team2: match.team2.teamName,
		points2: points2
	}
}

function chartIt(chart, data, labels, width, reverse) {
	const ctx = document.getElementById(chart).getContext('2d');
	const fontColor = "white";
	const tickColor = 'rgba(255, 255, 255, 0.16)';
	return new Chart(ctx, {
		type: 'stripe',
		data: {
			labels: labels,
			datasets: data.toArray()
				.map(([team, points]) => chartTeamPoints(team, points, width, ctx))
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			legend: {
				labels: {
					fontColor: fontColor
				}
			},
			scales: {
				xAxes: [{
					gridLines: {
						drawOnChartArea: false,
						color: tickColor
					},
					ticks: {
						fontColor: fontColor
					}
				}],
				yAxes: [{
					gridLines: {
						color: tickColor
					},
					ticks: {
						max: Math.max(...data.toArray().flatMap(([_, points]) => points)) + width,
						fontColor: fontColor,
						reverse: reverse
					}
				}]
			},
			tooltips: {
				mode: 'nearest',
				intersect: false,
			}
		}
	});
}

function chartTeamPoints(team, points, width, ctx) {
	const [color, secondaryColor] = getColor(team);
	// console.log(team + ": " + color);

	var contentWidth = window.innerWidth || document.body.clientWidth;
	const gradient = ctx.createLinearGradient(0, 0, contentWidth, 0);
	const steps = contentWidth / 50;
	for (var i = 1; i < steps; i++) {
		gradient.addColorStop(i / steps - 1 / steps, color);
		gradient.addColorStop(i / steps, secondaryColor);
	}

	return {
		label: team,
		data: points,
		width: Array(100).fill(width),
		fill: false,
		borderColor: gradient,
		backgroundColor: w3color(color).toHexString() + '08', // add alpha value
		borderWidth: 2,
		lineTension: 0.2, // closer to 0 => straight lines
		pointStyle: 'point',
		pointRadius: 2,
		pointHoverRadius: 4,
		pointBorderWidth: 2,
	}
}

// fill in the available seasons
async function addSeasons(seasonSel) {
	// in order to avoid having to hard-code a switch between seasons, try to get the current year/year+1 season, 
	// and if there are no games then (year-1)/year is the current one
	const currentYear = new Date().getFullYear();
	var latestSeason = currentYear;

	const matches = await fetchWithCache('bl1/' + currentYear);
	if (matches.length == 0) {
		latestSeason = currentYear - 1;
	}

	// clear options just in case
	while (seasonSel.hasChildNodes()) {
		seasonSel.removeChild(seasonSel.lastChild);
	}
	const startYear = 2002;

	for (year = latestSeason; year >= startYear; year--) {
		const opt = document.createElement('option');
		opt.value = year;
		opt.innerHTML = year + "/" + (year + 1).toString().substr(-2);
		opt.selected = year == latestSeason;
		seasonSel.appendChild(opt);
	}

}


var leagueSel, seasonSel
function load() {
	fetchData(leagueSel.value, seasonSel.value);
}

var toggle3 = true;
// ui hook
async function init() {
	console.log("Init")
	leagueSel = document.getElementById('league');
	seasonSel = document.getElementById('season');

	// for stripe chart
	document.getElementById('toggle3').addEventListener('change', () => {
		toggle3 = !toggle3;
		charts.forEach((c, i) => {
			c.update();
		});

	});

	await addSeasons(seasonSel);
	load();
}

window.onload = () => init();
