/*can-view-live@3.2.2#lib/attr*/
define([
    'require',
    'exports',
    'module',
    'can-util/dom/attr',
    './core',
    'can-reflect'
], function (require, exports, module) {
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