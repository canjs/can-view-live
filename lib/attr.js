var attr = require('can-util/dom/attr/attr');
var live = require('./core');
var canReflect = require('can-reflect');
/**
 * @function can-view-live.attr attr
 * @parent can-view-live
 *
 * @signature `live.attr(el, attributeName, observable)`
 *
 * Keep an attribute live to a [can-reflect]-ed observable.
 *
 * ```js
 * var div = document.createElement('div');
 * var value = new SimpleObservable("foo bar");
 * live.attr(div,"class", value);
 * ```
 *
 * @param {HTMLElement} el The element whos attribute will be kept live.
 * @param {String} attributeName The attribute name.
 * @param {Object} observable An observable value.
 *
 * @body
 *
 * ## How it works
 *
 * This listens for the changes in the observable and uses those changes to
 * set the specified property name.
 */
live.attr = function(el, attributeName, compute) {
	// #### live.attr
	// Bind a single attribute on an element to a compute
	live.listen(el, compute, function(newVal) {
		// when compute gets a new value, set the attribute
		//  to the new value
		attr.set(el, attributeName, newVal);
	});
	// do initial set of attribute as well
	attr.set(el, attributeName, canReflect.getValue(compute));
};
