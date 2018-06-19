var live = require('./core');
var nodeLists = require('can-view-nodelist');
var makeFrag = require('can-fragment');
var childNodes = require('can-child-nodes');
var canReflect = require('can-reflect');
var queues = require("can-queues");


function updateNodeList(oldNodes, nodes, frag, nodeListUpdatedByFn) {
	if(nodes.isUnregistered !== true) {
		if(!nodeListUpdatedByFn) {
			nodeLists.update(nodes, childNodes(frag), oldNodes);
		}
		nodeLists.replace(oldNodes, frag);
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
		var attached = nodeLists.first(nodes).parentNode;
		// update the nodes in the DOM with the new rendered value
		if (attached) {
			makeAndPut(newVal, true);
		}
		var pn = nodeLists.first(nodes).parentNode;
		data.teardownCheck(pn);
	}


	//!steal-remove-start
	// register that the handler changes the parent element
	canReflect.assignSymbols(liveHTMLUpdateHTML, {
		"can.getChangesDependencyRecord": function() {
			return {
				valueDependencies: new Set( [ parentNode ] )
			};
		}
	});
	
	Object.defineProperty(liveHTMLUpdateHTML, "name", {
		value: "live.html update::"+canReflect.getName(compute),
	});
	//!steal-remove-end


	data = live.listen(parentNode, compute, liveHTMLUpdateHTML);

	// Nodes registered to the live operation, either a list of nodes or a single element
	nodes = nodeList || [el];
	makeAndPut = function(val, useQueue) {
		// ##### makeandput
		// Receives the compute output (must be some DOM representation or a function)
		var isFunction = typeof val === "function",
			// translate val into a document fragment if it's DOM-like
			frag = makeFrag(isFunction ? "" : val);

		// Add a placeholder textNode if necessary.
		live.addTextNodeIfNoChildren(frag);

		// Mark each node as belonging to the node list.

		var oldNodes;
		// DOM replace old nodes with new frag (which might contain some old nodes)
		if(useQueue === true) {
			// unregister all children immediately
			oldNodes = nodeLists.unregisterChildren(nodes, true);

			var nodeListUpdatedByFn = false;
			// allow
			if (isFunction) {
				val(frag.firstChild);
				// see if nodes has already been updated
				nodeListUpdatedByFn = nodeLists.first(nodes) === frag.firstChild;
			}
			queues.domUIQueue.enqueue(updateNodeList, null, [oldNodes, nodes, frag, nodeListUpdatedByFn], meta);
		} else {
			// this is initialization, update right away.
			oldNodes = nodeLists.update(nodes, childNodes(frag));
			if (isFunction) {
				val(frag.firstChild);
			}
			nodeLists.replace(oldNodes, frag);
		}

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
