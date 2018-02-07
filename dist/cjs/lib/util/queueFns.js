/*can-view-live@3.2.5#lib/util/queueFns*/
var Observation = require('can-observation');
module.exports = function queueFns(fns, primaryDepth) {
    var updateQueue = [], queuedFns = {};
    var updateQueueObservation = {
        needsUpdate: false,
        update: function () {
            for (var i = 0; i < updateQueue.length; i++) {
                var obj = updateQueue[i];
                obj.fn.apply(obj.context, obj.args);
            }
            updateQueue = [];
        },
        getPrimaryDepth: function () {
            return primaryDepth || 0;
        }
    };
    var wrapFn = function (fn) {
        return function () {
            updateQueue.push({
                fn: fn,
                context: this,
                args: arguments
            });
            updateQueueObservation.needsUpdate = false;
            Observation.registerUpdate(updateQueueObservation);
        };
    };
    for (var key in fns) {
        queuedFns[key] = wrapFn(fns[key]);
    }
    queuedFns.clear = function () {
        updateQueue = [];
    };
    return queuedFns;
};