"use strict";
var live = require('./core');
var canReflect = require('can-reflect');
var setElementSymbol = Symbol.for("can.setElement");
var canReflectDeps = require('can-reflect-dependencies');
var domMutate = require("can-dom-mutate");

/**
 * @function can-view-live.text text
 * @parent can-view-live
 * @release 2.0.4
 *
 * @signature `live.text(el, compute, [parentNode], [nodeList])`
 *
 * Replaces one element with some content while keeping [can-view-live.nodeLists nodeLists] data correct.
 */
live.text = function(el, compute) {
	if(arguments.length > 2) {
		// TODO: remove
		throw new Error("too many arguments");

	}

	// TODO: we can remove this at some point
	if (el.nodeType !== Node.TEXT_NODE) {
		var textNode;

		textNode = document.createTextNode("");
		el.parentNode.replaceChild(textNode, el);
		el = textNode;

	}

	if( compute[setElementSymbol] ) {
		compute[setElementSymbol](el);
	} else {
		console.warn("no can.setElement symbol on observable", compute);
	}

	// Create a new text node from the compute value

	function liveTextUpdateTextNode(newVal) {
		el.nodeValue = live.makeString(newVal);
	}

	var teardownNodeRemoved;
	function teardown(){
		teardownNodeRemoved();
		//!steal-remove-start
		if(process.env.NODE_ENV !== 'production') {
			canReflectDeps.deleteMutatedBy(el, compute);
		}
		//!steal-remove-end
		canReflect.offValue(compute, liveTextUpdateTextNode, "domUI");
	}



	//!steal-remove-start
	if(process.env.NODE_ENV !== 'production') {
		// register that the handler changes the parent element
		canReflect.assignSymbols(liveTextUpdateTextNode, {
			"can.getChangesDependencyRecord": function() {
				var s = new Set();
				s.add(el);
				return {
					valueDependencies: s
				};
			}
		});

		Object.defineProperty(liveTextUpdateTextNode, "name", {
			value: "live.text update::"+canReflect.getName(compute),
		});

		if(process.env.NODE_ENV !== 'production') {
			canReflectDeps.addMutatedBy(el, compute);
		}
	}
	//!steal-remove-end

	teardownNodeRemoved = domMutate.onNodeRemoved(el, teardown);
	// TODO: should this still be domUI?
	canReflect.onValue(compute, liveTextUpdateTextNode, "domUI");
	liveTextUpdateTextNode( canReflect.getValue(compute) );
};
