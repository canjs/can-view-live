var attr = require('can-util/dom/attr/attr');
var nodeLists = require('can-view-nodelist');
var live = require('./core');
/**
 * @function can-view-live.attr attr
 * @parent can-view-live
 *
 * @signature `live.attr(el, attributeName, compute, nodeList)`
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
 * @param {can-view-nodelist} nodeList The
 *
 */
live.attr = function(el, attributeName, compute, nodeList){
	var origUnregistered;

	var data = live.listen(el, compute, function (ev, newVal) {
		attr.set(el, attributeName, newVal);
	});
	attr.set(el, attributeName, compute());

	// register the element so can-view-nodelist can unregister its event handler
	// when the nodeList is unregistered
	if(!nodeList) {
		nodeLists.register([ el ], data.teardownCheck);
	} else {
		// unregistered may already exist if this element is within a live html section
		origUnregistered = nodeList.unregistered;
		nodeList.unregistered = function() {
			data.teardownCheck();
			if (origUnregistered) {
				origUnregistered();
			}
		};
	}
};
