// # can/view/stache/live.js
//
// This provides live binding for stache attributes.
var live = require('./core');
var viewCallbacks = require('can-view-callbacks');
var attr = require('can-util/dom/attr/attr');
var domEvents = require('can-util/dom/events/events');

//??? Can these 3 lines be removed? - BigAB

live.attrs = function(el, compute, scope, options) {
	var oldAttrs = {};

	var setAttrs = function (newVal) {
		var newAttrs = live.getAttributeParts(newVal),
			name;
		for(name in newAttrs) {
			var newValue = newAttrs[name],
				oldValue = oldAttrs[name];
			if(newValue !== oldValue) {
				attr.set(el, name, newValue);
				var callback = viewCallbacks.attr(name);
				if(callback) {
					callback(el, {
						attributeName: name,
						scope: scope,
						options: options
					});
				}
			}
			delete oldAttrs[name];
		}
		for(name in oldAttrs) {
			attr.remove(el, name);
		}
		oldAttrs = newAttrs;
	};

	var handler = function (ev, newVal) {
		setAttrs(newVal);
	};

	compute.addEventListener('change', handler);
	domEvents.addEventListener.call(el, 'removed', function() {
		compute.removeEventListener('change', handler);
	});

	// current value has been set
	setAttrs(compute());
};
