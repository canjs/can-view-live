"use strict";

var makeFragment = require('can-fragment');
var childNodes = require('can-child-nodes');
var canReflect = require('can-reflect');
var canSymbol = require("can-symbol");
var queues = require("can-queues");
var domMutate = require("can-dom-mutate");
var domMutateNode = require("can-dom-mutate/node/node");
var canReflectDeps = require('can-reflect-dependencies');

var live = require('./core');
var helpers = require('./helpers');

var viewInsertSymbol = canSymbol.for("can.viewInsert");
var setElementSymbol = Symbol.for("can.setElement");
// TODO: ending and starting comment ....





/**
 * @function can-view-live.html html
 * @parent can-view-live
 * @release 2.0.4
 *
 * Live binds a compute's value to a collection of elements.
 *
 * @signature `live.html(el, compute, [parentNode])`
 *
 * `live.html` is used to setup incremental live-binding on a block of html.
 *
 * ```js
 * // a compute that changes its list
 * var greeting = compute(function(){
 *   return "Welcome <i>"+me.attr("name")+"</i>"
 * });
 *
 * var placeholder = document.createTextNode(" ");
 * $("#greeting").append(placeholder);
 *
 * live.html(placeholder, greeting);
 * ```
 *
 * @param {HTMLElement} el An html element to replace with the live-section.
 *
 * @param {can.compute} compute A [can.compute] whose value is HTML.
 *
 * @param {HTMLElement} [parentNode] An overwritable parentNode if `el`'s parent is
 * a documentFragment.
 *
 *
 */
live.html = function(el, compute, viewInsertSymbolOptions) {

	// Tell the compute to update in DOM order
	// ? - Could this be done all here?  I think we want derive to happen at the right time.


	// TODO: only needed in dev
	var observableName = canReflect.getName(compute);


	// replace element with a comment node
	var range = helpers.range.create(el, observableName);

	if( compute[setElementSymbol] ) {
		compute[setElementSymbol](range.start);
	} else {
		console.warn("no can.setElement symbol on observable", compute);
	}

	var meta = {reasonLog: "live.html replace::"+observableName, element: range.start};




	var teardownNodeRemoved,
		onChange,
		useQueue = false;
	function teardown(){
		console.log("tearing down", observableName);
		teardownNodeRemoved();
		//!steal-remove-start
		if(process.env.NODE_ENV !== 'production') {
			canReflectDeps.deleteMutatedBy(range.start, compute);
		}
		//!steal-remove-end
		canReflect.offValue(compute, onChange, "notify");
	}
	onChange = function(val) {

		// If val has the can.viewInsert symbol, call it and get something usable for val back
		if (val && typeof val[viewInsertSymbol] === "function") {
			val = val[viewInsertSymbol](viewInsertSymbolOptions);
		}

		var isFunction = typeof val === "function";

		// translate val into a document fragment if it's DOM-like
		var frag = makeFragment(isFunction ? "" : val);

		// Add a placeholder textNode if necessary.
		live.addTextNodeIfNoChildren(frag);

		if(isFunction) {
			val(frag.firstChild);
		}

		if(useQueue === true) {
			helpers.range.remove(range);
			queues.domQueue.enqueue(helpers.range.update, null, [range, frag], meta);
		} else {
			helpers.range.update(range, frag);
			useQueue = true;
		}
	};

	teardownNodeRemoved = domMutate.onNodeRemoved(range.start, teardown);

	//!steal-remove-start
	if(process.env.NODE_ENV !== 'production') {
		// register that the handler changes the parent element
		canReflect.assignSymbols(onChange, {
			"can.getChangesDependencyRecord": function() {
				var s = new Set();
				s.add(range.start);
				return {
					valueDependencies: s
				};
			}
		});

		Object.defineProperty(onChange, "name", {
			value: "live.html update::"+observableName,
		});

		if(process.env.NODE_ENV !== 'production') {
			canReflectDeps.addMutatedBy(range.start, compute);
		}
	}
	//!steal-remove-end

	canReflect.onValue(compute, onChange, "notify");




	// data = live.listen(parentNode, compute, liveHTMLUpdateHTML);
	onChange(  canReflect.getValue(compute) );
};
