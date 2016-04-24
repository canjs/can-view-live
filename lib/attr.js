var attr = require('can-util/dom/attr/attr');
var live = require('./core');
/**
 * @function can.view.live.attr
 * @parent can.view.live
 *
 * Keep an attribute live to a [can.compute].
 *
 * @param {HTMLElement} el The element whos attribute will be kept live.
 * @param {String} attributeName The attribute name.
 * @param {can.compute} compute The compute.
 *
 * @body
 *
 * ## Use
 *
 *     var div = document.createElement('div');
 *     var compute = can.compute("foo bar");
 *     can.view.live.attr(div,"class", compute);
 */
live.attr = function(el, attributeName, compute){
	live.listen(el, compute, function (ev, newVal) {
		attr.set(el, attributeName, newVal);
	});
	attr.set(el, attributeName, compute());
};
