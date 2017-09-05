var Observation = require("can-observation");

// wrap each of the passed `fn`s in `Observation.registerUpdate`
//
// each `fn` will be added to the `updateQueue`
// and then called in order when the `registerUpdate` triggers `update`
//
// also adds a `clear()` function that will remove all the `fn`s from the queue
module.exports = function queueFns(fns, primaryDepth) {
	var updateQueue = [],
		queuedFns = {};

	// create an "Observation" that duck types the properties needed
	// for Observation.registerUpdate
	var updateQueueObservation = {
		needsUpdate: false,
		update: function() {
			for (var i=0; i<updateQueue.length; i++) {
				var obj = updateQueue[i];
				obj.fn.apply(obj.context, obj.args);
			}

			// clean up the updateQueue after all `fn`s have been called
			updateQueue = [];
		},
		getPrimaryDepth: function() {
			return primaryDepth || 0;
		}
	};

	var wrapFn = function(fn) {
		return function() {
			// add function to queue
			updateQueue.push({
				fn: fn,
				context: this,
				args: arguments
			});

			// mark observation as needing an update
			updateQueueObservation.needsUpdate = false;

			// register the update queue to be updated
			// this ensures that add, set, remove, move are not called
			// after the nodelist has been torn down
			Observation.registerUpdate(updateQueueObservation);
		};
	};

	// wrap each of the passed functions
	for (var key in fns) {
		queuedFns[key] = wrapFn(fns[key]);
	}

	// add a `clear()` method that can be used to empty the updateQueue
	queuedFns.clear = function() {
		updateQueue = [];
	};

	return queuedFns;
};
