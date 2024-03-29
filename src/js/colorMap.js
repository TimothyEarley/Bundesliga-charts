// only use *full* hex colors, or everything breaks

const colorMap = new Map();

colorMap.set("FC Bayern München", ['#df2127', '#df2127']);
colorMap.set("TSG 1899 Hoffenheim", ['#1c63b7', '#1c63b7']);
colorMap.set("Hertha BSC", ['#005eaa', '#ffffff']);
colorMap.set("Werder Bremen", ['#009556', '#009556']);
colorMap.set("Hannover 96", ['#009822', '#009822']);
colorMap.set("SC Freiburg", ['#000000', '#b51c28']);
colorMap.set("Eintracht Frankfurt", ['#ce291f', '#000000']);
colorMap.set("VfL Wolfsburg", ['#00a300', '#00a300']);
colorMap.set("FC Schalke 04", ['#0063aa', '#0063aa']);
colorMap.set("FC Augsburg", ['#ba3733', '#ba3733']);
colorMap.set("Borussia Mönchengladbach", ['#000000', '#000000']);
colorMap.set("Bayer Leverkusen", ['#e4210b', '#e4210b']);
colorMap.set("1. FSV Mainz 05", ['#e62100', '#e62100']);
colorMap.set("VfB Stuttgart", ['#f22b1a', '#ffffff']);
colorMap.set("BV Borussia Dortmund 09", ['#ffe800', '#ffe800']);
colorMap.set("Borussia Dortmund", ['#ffe800', '#ffe800']);
colorMap.set("RB Leipzig", ['#e0223c', '#e0223c']);
colorMap.set("Fortuna Düsseldorf", ['#ffffff', '#ffffff']);
colorMap.set("1. FC Nürnberg", ['#ad1732', '#ad1732']);
colorMap.set("SC Paderborn 07", ['#005ea8', '#005ea8']);
colorMap.set("1. FC Union Berlin", ['#d20303', '#feec83']);
colorMap.set("1. FC Köln", ['#ffffff', '#eb2206']);
colorMap.set("Arminia Bielefeld", ['#015092', '#000000'])
colorMap.set("VfL Bochum", ['#005ca3', '#ffffff'])
colorMap.set("SpVgg Greuther Fürth", ['#009932', '#ffffff'])
colorMap.set("1. FC Heidenheim 1846", ['#ea3323', '#1a42f5'])
colorMap.set("SV Darmstadt 98", ['#1d499a', '#ffffff'])


function getColor(team) {
	if (colorMap.has(team)) {
		return colorMap.get(team);
	} else {
		console.log("No colour predefined for " + team)
		const hue = getRndInteger(0, 360)
		const hsl = "hsl(" + hue + ",100%,50%)";
		const c = [hsl, hsl]
		colorMap.set(team, c)
		return c;
	}
}
