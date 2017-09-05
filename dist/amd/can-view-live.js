/*can-view-live@3.2.2#can-view-live*/
define([
    'require',
    'exports',
    'module',
    './lib/core',
    './lib/attr',
    './lib/attrs',
    './lib/html',
    './lib/list',
    './lib/text'
], function (require, exports, module) {
    var live = require('./lib/core');
    require('./lib/attr');
    require('./lib/attrs');
    require('./lib/html');
    require('./lib/list');
    require('./lib/text');
    module.exports = live;
});