"use strict";
var parser = require('can-view-parser');
var domMutate = require('can-dom-mutate');
var nodeLists = require('can-view-nodelist');
var makeFrag = require('can-fragment');
var childNodes = require('can-child-nodes');
var canReflect = require('can-reflect');
var canReflectDeps = require('can-reflect-dependencies');

/**
 * @module {{}} can-view-live can-view-live
 * @parent can-views
 * @collection can-infrastructure
 * @package ../package.json
 *
 * Setup live-binding between the DOM and a compute manually.
 *
 * @option {Object} An object with the live-binding methods:
 * [can-view-live.html], [can-view-live.list], [can-view-live.text], and
 * [can-view-live.attr].
 *
 * @release 2.0.4
 *
 * @body
 *
 * ## Use
 *
 *  [can-view-live] is an object with utility methods for setting up
 *  live-binding in relation to different parts of the DOM and DOM elements.  For
 *  example, to make an `<h2>`'s text stay live with
 *  a compute:
 *
 *  ```js
 *  var live = require("can-view-live");
 *  var text = canCompute("Hello World");
 *  var textNode = $("h2").text(" ")[0].childNodes[0];
 *  live.text(textNode, text);
 *  ```
 *
 */
var live = {
	setup: function(el, bind, unbind) {
		// #### setup
		// Setup a live listener on an element that binds now,
		//  but unbinds when an element is no longer in the DOM
		var tornDown = false,
			removalDisposal,
			data,
			teardown = function() {
				// Removing an element can call teardown which
				// unregister the nodeList which calls teardown
				if (!tornDown) {
					tornDown = true;
					unbind(data);
					if (removalDisposal) {
						removalDisposal();
						removalDisposal = undefined;
					}
				}
				return true;
			};
		data = {
			teardownCheck: function(parent) {
				return parent ? false : teardown();
			}
		};
		removalDisposal = domMutate.onNodeRemoval(el, function () {
			if (!el.ownerDocument.contains(el)) {
				teardown();
			}
		});
		bind(data);
		return data;
	},
	// #### listen
	// Calls setup, but presets bind and unbind to
	// operate on a compute
	listen: function(el, compute, change, queueName) {
		return live.setup(
			el,
			function bind() {
				// listen to notify, so on a change, this can
				// teardown all children quickly.
				canReflect.onValue(compute, change, queueName || "notify");
				//compute.computeInstance.addEventListener('change', change);

				//!steal-remove-start
				if(process.env.NODE_ENV !== 'production') {
					canReflectDeps.addMutatedBy(el, compute);
				}
				//!steal-remove-end
			},
			function unbind(data) {
				canReflect.offValue(compute, change, queueName || "notify");

				//!steal-remove-start
				if(process.env.NODE_ENV !== 'production') {
					canReflectDeps.deleteMutatedBy(el, compute);
				}
				//!steal-remove-end

				//compute.computeInstance.removeEventListener('change', change);
				if (data.nodeList) {
					nodeLists.unregister(data.nodeList);
				}
			}
		);
	},
	// #### getAttributeParts
	// Breaks up a string like foo='bar' into an object of {"foo": "bar"} pairs
	// See can-view-parser for more about attrStart/attrEnd/attrValue
	getAttributeParts: function(newVal) {
		var attrs = {},
			attr;
		parser.parseAttrs(newVal, {
			attrStart: function(name) {
				attrs[name] = "";
				attr = name;
			},
			attrValue: function(value) {
				attrs[attr] += value;
			},
			attrEnd: function() {}
		});
		return attrs;
	},
	// #### isNode
	// Checks a possible node object for the nodeType property
	isNode: function(obj) {
		return obj && obj.nodeType;
	},
	// #### addTextNodeIfNoChildren
	// Append an empty text node to a parent with no children;
	//  do nothing if the parent already has children.
	addTextNodeIfNoChildren: function(frag) {
		if (!frag.firstChild) {
			frag.appendChild(frag.ownerDocument.createTextNode(""));
		}
	},


	/**
	 * @function can.view.live.replace
	 * @parent can.view.live
	 * @release 2.0.4
	 * @hide
	 *
	 * Replaces one element with some content while keeping [can.view.live.nodeLists nodeLists] data
	 * correct.
	 *
	 * @param {Array.<HTMLElement>} nodes An array of elements.  There should typically be one element.
	 * @param {String|HTMLElement|DocumentFragment} val The content that should replace
	 * `nodes`.  If a string is passed, it will be [can.view.hookup hookedup].
	 *
	 * @param {function} [teardown] A callback if these elements are torn down.
	 */
	replace: function(nodes, val, teardown) {
		// #### replace
		// Replaces one element with some content while keeping nodeLists data
		// correct.
		//
		// Take a copy of old nodeList
		var oldNodes = nodes.slice(0),
			frag = makeFrag(val);
		// Register a teardown callback
		nodeLists.register(nodes, teardown);
		// Mark each node as belonging to the node list.
		nodeLists.update(nodes, childNodes(frag));
		// Replace old nodes with new on the DOM
		nodeLists.replace(oldNodes, frag);
		return nodes;
	},
	// #### getParentNode
	// Return default parent if el is a fragment, el's parent otherwise
	getParentNode: function(el, defaultParentNode) {
		return defaultParentNode && el.parentNode.nodeType === 11 ? defaultParentNode : el.parentNode;
	},
	// #### makeString
	// any -> string converter (including nullish)
	makeString: function(txt) {
		return txt == null ? "" : "" + txt;
	}
};

module.exports = live;
