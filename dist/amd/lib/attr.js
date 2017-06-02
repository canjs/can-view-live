/*can-view-live@3.1.0-pre.3#lib/attr*/
define(function (require, exports, module) {
    var attr = require('can-util/dom/attr');
    var live = require('./core');
    var canReflect = require('can-reflect');
    live.attr = function (el, attributeName, compute) {
        live.listen(el, compute, function (newVal) {
            attr.set(el, attributeName, newVal);
        });
        attr.set(el, attributeName, canReflect.getValue(compute));
    };
});