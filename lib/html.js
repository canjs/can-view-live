var live = require('./core');
var nodeLists = require('can-view-nodelist');
var makeFrag = require('can-util/dom/frag/frag');
var makeArray = require('can-util/js/make-array/make-array');
var childNodes = require('can-util/dom/child-nodes/child-nodes');

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
live.html = function (el, compute, parentNode, nodeList) {
	var data;
	// prefer to manipulate el's actual parent over the supplied parent
	parentNode = live.getParentNode(el, parentNode);
	data = live.listen(parentNode, compute, function (ev, newVal, oldVal) {
		// the attachment point for the nodelist
		var attached = nodeLists.first(nodes).parentNode;
		// update the nodes in the DOM with the new rendered value
		if (attached) {
			makeAndPut(newVal);
		}
		var pn = nodeLists.first(nodes).parentNode;
		data.teardownCheck(pn);
		live.callChildMutationCallback(pn);
	});

	// Nodes registered to the live operation, either a list of nodes or a single element
	var nodes = nodeList || [el],
		makeAndPut = function (val) {
			// ##### makeandput
			// Receives the compute output (must be some DOM representation or a function)
			var isFunction = typeof val === "function",
				aNode = live.isNode(val),
				// translate val into a document fragment if it's DOM-like
				frag = makeFrag(isFunction ? "" : val),
				// previous set of nodes
				oldNodes = makeArray(nodes);

			// Add a placeholder textNode if necessary.
			live.addTextNodeIfNoChildren(frag);

			// Mark each node as belonging to the node list.
			oldNodes = nodeLists.update(nodes, childNodes(frag));
			if(isFunction) {
				val(frag.firstChild);
			}
			// DOM replace old nodes with new frag (which might contain some old nodes)
			nodeLists.replace(oldNodes, frag);
		};

	data.nodeList = nodes;

	// register the span so nodeLists knows the parentNodeList
	if(!nodeList) {
		nodeLists.register(nodes, data.teardownCheck);
	} else {
		nodeList.unregistered = data.teardownCheck;
	}
	// Finally give the subtree an initial value
	makeAndPut(compute());
};
