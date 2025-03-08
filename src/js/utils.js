Array.prototype.groupBy = function(f) {
	return this.reduce((groups, item) => {
    const val = f(item)
		if (! groups.has(val)) {
			groups.set(val, [])
		}
    groups.get(val).push(item)
    return groups
  }, new Map())
}

Map.prototype.mapValues = function(f) {
	const result = new Map();
	if (f.length == 2) {
		// pass the key and value
		this.forEach((v, k) => result.set(k, f(k, v)));
	}
	else {
		// only pass value
		this.forEach((v, k) => result.set(k, f(v)));
	}
	return result;
}

Map.prototype.toArray = function() {
	return Array.from(this.entries());
}

Array.prototype.sortBy = function(prop) {
	// TODO memoize prop
	return this.sort((a, b) => prop(a) - prop(b))
}

Array.prototype.sum = function() {
	let sum = 0
	this.forEach(v => sum += v)
	return sum
}

Array.prototype.min = function() {
	return Math.min.apply(null, this)
}

Array.prototype.max = function() {
	return Math.max.apply(null, this)
}

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}
