// This provides live binding for stache attributes.
var live = require('./core');
var viewCallbacks = require('can-view-callbacks');
var attr = require('can-util/dom/attr/attr');
var domEvents = require('can-util/dom/events/events');
var types = require('can-types');

live.attrs = function(el, compute, scope, options) {
	if(!types.isCompute(compute)) {
		// Non-live case (`compute` was not a compute):
		//  set all attributes on the element and don't
		//  worry about setting up live binding since there
		//  is not compute to bind on.
		var attrs = live.getAttributeParts(compute);
		for(var name in attrs) {
			attr.set(el, name, attrs[name]);
		}
		return;
	}

	// last set of attributes
	var oldAttrs = {};

	// set up a callback for handling changes when the compute
	// changes
	var setAttrs = function (newVal) {
		var newAttrs = live.getAttributeParts(newVal),
			name;
		for(name in newAttrs) {
			var newValue = newAttrs[name],
				// `oldAttrs` was set on the last run of setAttrs in this context
				//  (for this element and compute)
				oldValue = oldAttrs[name];
			// Only fire a callback
			//  if the value of the attribute has changed
			if(newValue !== oldValue) {
				// set on DOM attributes (dispatches an "attributes" event as well)
				attr.set(el, name, newValue);
				// get registered callback for attribute name and fire
				var callback = viewCallbacks.attr(name);
				if(callback) {
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
		for(name in oldAttrs) {
			attr.remove(el, name);
		}
		oldAttrs = newAttrs;
	};

	var handler = function (ev, newVal) {
		setAttrs(newVal);
	};

	// set attributes on any change to the compute
	compute.addEventListener('change', handler);

	var teardownHandler = function() {
		compute.removeEventListener('change', handler);
		domEvents.removeEventListener.call(el, 'removed', teardownHandler);
	};
	// unbind on element removal
	domEvents.addEventListener.call(el, 'removed', teardownHandler);

	// set up a current attribute set and assign to oldAttrs
	setAttrs(compute());
};
