"use strict";
var live = require('./core');
var nodeLists = require('can-view-nodelist');
var canReflect = require('can-reflect');

/**
 * @function can-view-live.text text
 * @parent can-view-live
 * @release 2.0.4
 *
 * @signature `live.text(el, compute, [parentNode], [nodeList])`
 *
 * Replaces one element with some content while keeping [can-view-live.nodeLists nodeLists] data correct.
 */
live.text = function(el, compute, parentNode, nodeList) {
	// TODO: we can remove this at some point
	if (el.nodeType !== Node.TEXT_NODE) {
		var textNode;
		if (!nodeList) {
			textNode = document.createTextNode("");
			el.parentNode.replaceChild(textNode, el);
			el = textNode;
		} else {
			textNode = document.createTextNode("");
			nodeLists.replace(nodeList, textNode);
			nodeLists.update(nodeList, [textNode]);
			el = textNode;
		}
	}

	var parent = live.getParentNode(el, parentNode);
	// setup listening right away so we don't have to re-calculate value

	// Create a new text node from the compute value
	el.nodeValue = live.makeString(canReflect.getValue(compute));

	function liveTextUpdateTextNode(newVal) {
		el.nodeValue = live.makeString(newVal);
	}

	//!steal-remove-start
	if(process.env.NODE_ENV !== 'production') {
		// register that the handler changes the parent element
		canReflect.assignSymbols(liveTextUpdateTextNode, {
			"can.getChangesDependencyRecord": function() {
				return {
					valueDependencies: new Set( [ parent ] )
				};
			}
		});

		Object.defineProperty(liveTextUpdateTextNode, "name", {
			value: "live.text update::"+canReflect.getName(compute),
		});
	}
	//!steal-remove-end

	var data = live.listen(parent, compute, liveTextUpdateTextNode,"domUI");

	if(!nodeList) {
		nodeList = nodeLists.register([el], null, true);
	}

	nodeList.unregistered = data.teardownCheck;
	data.nodeList = nodeList;
};
