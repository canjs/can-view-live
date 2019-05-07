"use strict";
var live = require('./core');
var makeFragment = require('can-fragment');
var childNodes = require('can-child-nodes');
var canReflect = require('can-reflect');
var canSymbol = require("can-symbol");
var queues = require("can-queues");
var domMutate = require("can-dom-mutate");
var domMutateNode = require("can-dom-mutate/node/node")

var viewInsertSymbol = canSymbol.for("can.viewInsert");

// TODO: ending and starting comment ....


function removeDomRange( range ) {

	// remove from the end
	var next,
		parentNode = range.start.parentNode;
	while(range.end !== range.start) {
		next = range.end.previousSibling;
		domMutateNode.removeChild.call(parentNode, range.end );
		range.end = next;
	}

	domMutate.flushRecords();
}

function updateDomRange( range, frag ) {
	var parentNode = range.start.parentNode;

	// TODO: Remove in production
	if(range.start !== range.end) {
		throw new Error("range's not equal")
	}
	range.end = frag.lastChild;
	domMutateNode.insertBefore.call(parentNode, frag, range.start.nextSibling);
	//domMutate.flushRecords();
}



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
live.html = function(el, compute) {

	// Tell the compute to update in DOM order
	// ? - Could this be done all here?  I think we want derive to happen at the right time.


	// TODO: only needed in dev
	var observableName = canReflect.getName(compute);


	// replace element with a comment node
	var range = {start: null, end: null};

	if(el.nodeType === Node.COMMENT_NODE) {
		range.start = range.end = el;
		el.nodeValue = canReflect.getName( compute );
	} else {
		range.start = range.end = el.ownerDocument.createComment( observableName );
		el.parentNode.replaceChild( range.start, el);
	}
	compute[Symbol.for("can.setElement")](range.start);
	var meta = {reasonLog: "live.html replace::"+observableName, element: range.start};




	var teardownNodeRemoved,
		onChange,
		useQueue = false;
	function teardown(){
		console.log("tearing down", observableName);
		teardownNodeRemoved();
		canReflect.offValue(compute, onChange, "notify");
	}
	onChange = function(val) {
		console.log("got change", observableName)
		// If val has the can.viewInsert symbol, call it and get something usable for val back
		if (val && typeof val[viewInsertSymbol] === "function") {
			val = val[viewInsertSymbol]({});
		}

		var isFunction = typeof val === "function";

		// translate val into a document fragment if it's DOM-like
		var frag = makeFragment(isFunction ? "" : val);

		// Add a placeholder textNode if necessary.
		live.addTextNodeIfNoChildren(frag);


		if(useQueue === true) {
			removeDomRange(range);
			queues.domQueue.enqueue(updateDomRange, null, [range, frag], meta);
		} else {
			updateDomRange(range, frag);
			useQueue = true;
		}
	};

	teardownNodeRemoved = domMutate.onNodeRemoved(range.start, teardown);

	canReflect.onValue(compute, onChange, "notify");


	//!steal-remove-start
	if(process.env.NODE_ENV !== 'production') {
		// register that the handler changes the parent element
		// TODO: wait to do this as `el.parentNode` probably has not settled
		canReflect.assignSymbols(onChange, {
			"can.getChangesDependencyRecord": function() {
				var s = new Set();
				s.add(el.parentNode);
				return {
					valueDependencies: s
				};
			}
		});

		Object.defineProperty(onChange, "name", {
			value: "live.html update::"+observableName,
		});
	}
	//!steal-remove-end

	// data = live.listen(parentNode, compute, liveHTMLUpdateHTML);
	onChange(  canReflect.getValue(compute) );
};
