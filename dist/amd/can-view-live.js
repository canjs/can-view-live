/*can-view-live@3.2.1#can-view-live*/
define(function (require, exports, module) {
    var live = require('./lib/core');
    require('./lib/attr');
    require('./lib/attrs');
    require('./lib/html');
    require('./lib/list');
    require('./lib/text');
    module.exports = live;
});