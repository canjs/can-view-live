/*can-view-live@3.0.0#lib/attr*/
var attr = require('can-util/dom/attr/attr');
var live = require('./core.js');
live.attr = function (el, attributeName, compute) {
    live.listen(el, compute, function (ev, newVal) {
        attr.set(el, attributeName, newVal);
    });
    attr.set(el, attributeName, compute());
};