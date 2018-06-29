"use strict";
var live = require('./core');
var canReflect = require('can-reflect');
var queues = require("can-queues");
var attr = require("can-attribute-observable/behaviors");

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
 * set the specified attribute.
 */
live.attr = function(el, attributeName, compute) {
	function liveUpdateAttr(newVal) {
		queues.domUIQueue.enqueue(attr.set, attr, [el, attributeName, newVal]);
	}
	//!steal-remove-start
	if(process.env.NODE_ENV !== 'production') {
		// register that the handler changes the parent element
		canReflect.assignSymbols(liveUpdateAttr, {
			"can.getChangesDependencyRecord": function() {
				return {
					valueDependencies: new Set( [ el ] )
				};
			}
		});
		Object.defineProperty(liveUpdateAttr, "name", {
			value: "live.attr update::"+canReflect.getName(compute),
		});
	}
	//!steal-remove-end

	// Bind a single attribute on an element to a compute
	live.listen(el, compute, liveUpdateAttr);

	// do initial set of attribute as well
	attr.set(el, attributeName, canReflect.getValue(compute));
};
