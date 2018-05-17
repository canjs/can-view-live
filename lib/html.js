var live = require('./core');
var domMutate = require("can-dom-mutate/node");
var nodeLists = require('can-view-nodelist');
var makeFrag = require('can-util/dom/frag/frag');
var makeArray = require('can-util/js/make-array/make-array');
var childNodes = require('can-util/dom/child-nodes/child-nodes');
var canReflect = require('can-reflect');
var queues = require("can-queues");

function after(oldElements, newFrag) {
	var last = oldElements[oldElements.length - 1];
	// Insert it in the `document` or `documentFragment`
	if (last.nextSibling) {
		domMutate.insertBefore.call(last.parentNode, newFrag, last.nextSibling);
	} else {
		domMutate.appendChild.call(last.parentNode, newFrag );
	}
}

function remove(elementsToBeRemoved) {
	var parent = elementsToBeRemoved[0] && elementsToBeRemoved[0].parentNode;
	for (var i = 0; i < elementsToBeRemoved.length; i++) {
		domMutate.removeChild.call(parent, elementsToBeRemoved[i]);
	}
}

function replace(oldElements, newFrag) {
	var selectedValue,
		parentNode = oldElements[0].parentNode;

	if(parentNode.nodeName.toUpperCase() === "SELECT" && parentNode.selectedIndex >= 0) {
		selectedValue = parentNode.value;
	}
	if(oldElements.length === 1) {
		domMutate.replaceChild.call(parentNode, newFrag, oldElements[0]);
	} else {
		after(oldElements, newFrag);
		remove(oldElements);
	}

	if(selectedValue !== undefined) {
		parentNode.value = selectedValue;
	}
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
live.html = function(el, compute, parentNode, nodeList) {
	var data,
		makeAndPut,
		nodes;

	var meta = {reasonLog: "live.html replace::"+canReflect.getName(compute)};
	// prefer to manipulate el's actual parent over the supplied parent
	parentNode = live.getParentNode(el, parentNode);

	function liveHTMLUpdateHTML(newVal) {
		// the attachment point for the nodelist
		//var attached = nodeLists.first(nodes).parentNode;
		var attached = nodes[0].parentNode;
		// update the nodes in the DOM with the new rendered value
		if (attached) {
			makeAndPut(newVal, true);
		}
		//var pn = nodeLists.first(nodes).parentNode;
		var pn = nodes[0].parentNode;
		data.teardownCheck(pn);
	}
	// register that the handler changes the parent element
	canReflect.assignSymbols(liveHTMLUpdateHTML, {
		"can.getChangesDependencyRecord": function() {
			return {
				valueDependencies: new Set( [ parentNode ] )
			};
		}
	});

	//!steal-remove-start
	Object.defineProperty(liveHTMLUpdateHTML, "name", {
		value: "live.html update::"+canReflect.getName(compute),
	});
	//!steal-remove-end

	data = live.listen(parentNode, compute, liveHTMLUpdateHTML);

	// Nodes registered to the live operation, either a list of nodes or a single element
	nodes = [el];//nodeList || [el];
	makeAndPut = function(val, useQueue) {
		// ##### makeandput
		// Receives the compute output (must be some DOM representation or a function)
		var isFunction = typeof val === "function",
			// translate val into a document fragment if it's DOM-like
			frag = makeFrag(isFunction ? "" : val),
			// previous set of nodes
			oldNodes = makeArray(nodes);

		// Add a placeholder textNode if necessary.
		live.addTextNodeIfNoChildren(frag);

		// Mark each node as belonging to the node list.
		//oldNodes = nodeLists.update(nodes, childNodes(frag));
		if (isFunction) {
			val(frag.firstChild);
		}

		nodes = makeArray(childNodes(frag));

		if(false && useQueue === true) {
			queues.domUIQueue.enqueue(replace, null, [oldNodes, frag], meta);
		} else {
			replace(oldNodes, frag);
		}

		// DOM replace old nodes with new frag (which might contain some old nodes)
		//if(useQueue === true) {
		//	queues.domUIQueue.enqueue(nodeLists.replace, nodeLists, [oldNodes, frag], meta);
		//} else {
			// this is initialization, update right away.
		//	nodeLists.replace(oldNodes, frag);
		//}

	};

	data.nodeList = nodes;

	// register the span so nodeLists knows the parentNodeList
	if (!nodeList) {
		nodeLists.register(nodes, data.teardownCheck);
	} else {
		nodeList.unregistered = data.teardownCheck;
	}
	// Finally give the subtree an initial value
	makeAndPut(canReflect.getValue(compute));
};
