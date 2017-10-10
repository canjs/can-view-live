var Observation = require("can-observation");

// wrap each of the passed `fn`s in `Observation.registerUpdate`
//
// each `fn` will be added to the `updateQueue`
// and then called in order when the `registerUpdate` triggers `update`
//
// also adds a `clear()` function that will remove all the `fn`s from the queue
module.exports = function queueFns(fns, primaryDepth) {
	return fns;
};
