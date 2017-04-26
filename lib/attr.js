var attr = require('can-util/dom/attr/attr');
var live = require('./core');
/**
 * @function can-view-live.attr attr
 * @parent can-view-live
 *
 * @signature `live.attr(el, attributeName, compute)`
 *
 * Keep an attribute live to a [can-compute].
 *
 * ```js
 * var div = document.createElement('div');
 * var compute = canCompute("foo bar");
 * live.attr(div,"class", compute);
 * ```
 *
 * @param {HTMLElement} el The element whos attribute will be kept live.
 * @param {String} attributeName The attribute name.
 * @param {can-compute} compute The compute.
 *
 */
live.attr = function(el, attributeName, compute){
	// #### live.attr
	// Bind a single attribute on an element to a compute
	live.listen(el, compute, function (ev, newVal) {
	// when compute gets a new value, set the attribute
	//  to the new value
		attr.set(el, attributeName, newVal);
	});
	// do initial set of attribute as well
	attr.set(el, attributeName, compute());
};
