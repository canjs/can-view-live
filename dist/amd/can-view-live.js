/*can-view-live@3.0.0-pre.5#can-view-live*/
define(function (require, exports, module) {
    var live = require('./lib/core');
    require('./lib/attr');
    require('./lib/attrs');
    require('./lib/html');
    require('./lib/list');
    require('./lib/text');
    module.exports = live;
});