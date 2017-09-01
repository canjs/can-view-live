/*can-view-live@3.2.1#lib/attr*/
var attr = require('can-util/dom/attr/attr');
var live = require('./core.js');
var canReflect = require('can-reflect');
live.attr = function (el, attributeName, compute) {
    live.listen(el, compute, function (newVal) {
        attr.set(el, attributeName, newVal);
    });
    attr.set(el, attributeName, canReflect.getValue(compute));
};