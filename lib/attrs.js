"use strict";
// This provides live binding for stache attributes.
var live = require('./core');
var viewCallbacks = require('can-view-callbacks');
var domMutate = require('can-dom-mutate');
var domMutateNode = require('can-dom-mutate/node');
var canReflect = require('can-reflect');
var canReflectDeps = require('can-reflect-dependencies');

live.attrs = function(el, compute, scope, options) {

	if (!canReflect.isObservableLike(compute)) {
		// Non-live case (`compute` was not a compute):
		//  set all attributes on the element and don't
		//  worry about setting up live binding since there
		//  is not compute to bind on.
		var attrs = live.getAttributeParts(compute);
		for (var name in attrs) {
			domMutateNode.setAttribute.call(el, name, attrs[name]);
		}
		return;
	}

	// last set of attributes
	var oldAttrs = {};

	// set up a callback for handling changes when the compute
	// changes
	function liveAttrsUpdate(newVal) {
		var newAttrs = live.getAttributeParts(newVal),
			name;
		for (name in newAttrs) {
			var newValue = newAttrs[name],
				// `oldAttrs` was set on the last run of setAttrs in this context
				//  (for this element and compute)
				oldValue = oldAttrs[name];
			// Only fire a callback
			//  if the value of the attribute has changed
			if (newValue !== oldValue) {
				// set on DOM attributes (dispatches an "attributes" event as well)
				domMutateNode.setAttribute.call(el, name, newValue);
				// get registered callback for attribute name and fire
				var callback = viewCallbacks.attr(name);
				if (callback) {
					callback(el, {
						attributeName: name,
						scope: scope,
						options: options
					});
				}
			}
			// remove key found in new attrs from old attrs
			delete oldAttrs[name];
		}
		// any attrs left at this point are not set on the element now,
		// so remove them.
		for (name in oldAttrs) {
			domMutateNode.removeAttribute.call(el, name);
		}
		oldAttrs = newAttrs;
	}

	//!steal-remove-start
	if(process.env.NODE_ENV !== 'production') {
		// register that the handler changes the parent element
		canReflect.assignSymbols(liveAttrsUpdate, {
			"can.getChangesDependencyRecord": function() {
				return {
					valueDependencies: new Set( [ el ] )
				};
			}
		});
		
		Object.defineProperty(liveAttrsUpdate, "name", {
			value: "live.attrs update::"+canReflect.getName(compute),
		});
		canReflectDeps.addMutatedBy(el, compute);
	}
	//!steal-remove-end

	// set attributes on any change to the compute
	canReflect.onValue(compute, liveAttrsUpdate,"domUI");

	var removalDisposal;
	var teardownHandler = function() {
		canReflect.offValue(compute, liveAttrsUpdate,"domUI");
		if (removalDisposal) {
			removalDisposal();
			removalDisposal = undefined;
		}

		//!steal-remove-start
		if(process.env.NODE_ENV !== 'production') {
			canReflectDeps.deleteMutatedBy(el, compute);
		}
		//!steal-remove-end
	};
	// unbind on element removal
	removalDisposal = domMutate.onNodeRemoval(el, function () {
		if (!el.ownerDocument.contains(el)) {
			teardownHandler();
		}
	});

	// set up a current attribute set and assign to oldAttrs
	liveAttrsUpdate(canReflect.getValue(compute));
};
