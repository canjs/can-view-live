"use strict";
var live = require('./core');

var nodeLists = require('can-view-nodelist');

var frag = require('can-fragment');
var childNodes = require('can-child-nodes');
var domMutateNode = require('can-dom-mutate/node');
var canReflect = require("can-reflect");


var canSymbol = require("can-symbol");

var canReflectDeps = require("can-reflect-dependencies");

var SimpleObservable = require("can-simple-observable");
var SetObservable = require("./set-observable");
var Patcher = require("can-diff/patcher/patcher");

var splice = [].splice;

// #### renderAndAddToNodeLists
// a helper function that renders something and adds its nodeLists to newNodeLists
// in the right way for stache.
var renderAndAddToNodeLists = function(newNodeLists, parentNodeList, render, context, args) {
		var itemNodeList = [];

		if (parentNodeList) {
			// With a supplied parent list, "directly" register the new nodeList
			//  as a child.
			nodeLists.register(itemNodeList, null, true, true);
			itemNodeList.parentList = parentNodeList;
			itemNodeList.expression = "#each SUBEXPRESSION";
		}

		// call the renderer, passing in the new nodeList as the last argument
		var itemHTML = render.apply(context, args.concat([itemNodeList])),
			// and put the output into a document fragment
			itemFrag = frag(itemHTML);

		// get all the direct children of the frag
		var children = canReflect.toArray(childNodes(itemFrag));
		if (parentNodeList) {
			// if a parent list was supplied, children of the frag become the
			//  child nodeList items.
			nodeLists.update(itemNodeList, children);
			newNodeLists.push(itemNodeList);
		} else {
			// If no parent nodeList, register the new array of frag children as a nodeList
			//  and push into the nodeLists
			newNodeLists.push(nodeLists.register(children));
		}
		return itemFrag;
	},
	// #### removeFromNodeList
	// a splicing helper for nodeLists, which removes sublists, including unregistering,
	//  for a contiguous slice of the master list.
	removeFromNodeList = function(masterNodeList, index, length) {
		var removedMappings = masterNodeList.splice(index + 1, length),
			itemsToRemove = [];
		removedMappings.forEach( function(nodeList) {

			// Unregister to free up event bindings.
			var nodesToRemove = nodeLists.unregister(nodeList);

			// add items that we will remove all at once
			[].push.apply(itemsToRemove, nodesToRemove);
		});
		return itemsToRemove;
	};




var onPatchesSymbol = canSymbol.for("can.onPatches");
var offPatchesSymbol = canSymbol.for("can.offPatches");

function ListDOMPatcher(el, compute, render, context, parentNode, nodeList, falseyRender) {
	this.patcher = new Patcher(compute);

	// argument cleanup
	parentNode = live.getParentNode(el, parentNode);

	// function callback binding

	// argument saving -----
	this.value = compute;
	this.render = render;
	this.context = context;
	this.parentNode = parentNode;
	this.falseyRender = falseyRender;
	// A nodeList of all elements this live-list manages.
	// This is here so that if this live list is within another section
	// that section is able to remove the items in this list.
	this.masterNodeList = nodeList || nodeLists.register([el], null, true);
	this.placeholder = el;

	// A mapping of items to their indices
	this.indexMap = [];

	this.isValueLike = canReflect.isValueLike(this.value);
	this.isObservableLike = canReflect.isObservableLike(this.value);

	// Setup binding and teardown to add and remove events
	this.onPatches = this.onPatches.bind(this);
	var data = this.data = live.setup(
		parentNode,
		this.setupValueBinding.bind(this),
		this.teardownValueBinding.bind(this)
	);

	this.masterNodeList.unregistered = function() {
		data.teardownCheck();
		//isTornDown = true;
	};

	//!steal-remove-start
	if(process.env.NODE_ENV !== 'production') {
		Object.defineProperty(this.onPatches, "name", {
			value: "live.list update::"+canReflect.getName(compute),
		});
	}
	//!steal-remove-end
}

var onPatchesSymbol = canSymbol.for("can.onPatches");
var offPatchesSymbol = canSymbol.for("can.offPatches");

ListDOMPatcher.prototype = {
	setupValueBinding: function() {
		this.patcher[onPatchesSymbol](this.onPatches, "domUI");
		if (this.patcher.currentList && this.patcher.currentList.length) {
			this.onPatches([{
				insert: this.patcher.currentList,
				index: 0,
				deleteCount: 0
			}]);
		} else {
			this.addFalseyIfEmpty();
		}
		//!steal-remove-start
		if(process.env.NODE_ENV !== 'production') {
			canReflectDeps.addMutatedBy(this.parentNode, this.patcher.observableOrList);
		}
		//!steal-remove-end
	},
	teardownValueBinding: function() {
		this.patcher[offPatchesSymbol](this.onPatches, "domUI");
		this.exit = true;
		this.remove({
			length: this.patcher.currentList.length
		}, 0, true);
		//!steal-remove-start
		if(process.env.NODE_ENV !== 'production') {
			canReflectDeps.deleteMutatedBy(this.parentNode, this.patcher.observableOrList);
		}
		//!steal-remove-end
	},
	onPatches: function ListDOMPatcher_onPatches(patches) {
		if (this.exit) {
			return;
		}
		for (var i = 0, patchLen = patches.length; i < patchLen; i++) {
			var patch = patches[i];
			if (patch.type === "move") {
				this.move(patch.toIndex, patch.fromIndex);
			} else {
				if (patch.deleteCount) {
					// Remove any items scheduled for deletion from the patch.
					this.remove({
						length: patch.deleteCount
					}, patch.index, true);
				}
				if (patch.insert && patch.insert.length) {
					// Insert any new items at the index
					this.add(patch.insert, patch.index);
				}
			}

		}
	},
	add: function(items, index) {
		//if (!afterPreviousEvents) {
		//	return;
		//}
		// Collect new html and mappings
		var frag = this.placeholder.ownerDocument.createDocumentFragment(),
			newNodeLists = [],
			newIndicies = [],
			masterNodeList = this.masterNodeList,
			render = this.render,
			context = this.context;
		// For each new item,
		items.forEach( function(item, key) {

			var itemIndex = new SimpleObservable(key + index),
				itemCompute = new SetObservable(item, function(newVal) {
					canReflect.setKeyValue(this.patcher.currentList, itemIndex.get(), newVal );
				}.bind(this)),
				itemFrag = renderAndAddToNodeLists(newNodeLists, masterNodeList, render, context, [itemCompute, itemIndex]);

			// Hookup the fragment (which sets up child live-bindings) and
			// add it to the collection of all added elements.
			frag.appendChild(itemFrag);
			// track indicies;
			newIndicies.push(itemIndex);
		}, this);
		// The position of elements is always after the initial text placeholder node
		var masterListIndex = index + 1;

		// remove falsey if there's something there
		if (!this.indexMap.length) {
			// remove all leftover things
			var falseyItemsToRemove = removeFromNodeList(masterNodeList, 0, masterNodeList.length - 1);
			nodeLists.remove(falseyItemsToRemove);
		}

		// Check if we are adding items at the end
		if (!masterNodeList[masterListIndex]) {
			nodeLists.after(masterListIndex === 1 ? [this.placeholder] : [nodeLists.last(this.masterNodeList[masterListIndex - 1])], frag);
		} else {
			// Add elements before the next index's first element.
			var el = nodeLists.first(masterNodeList[masterListIndex]);
			domMutateNode.insertBefore.call(el.parentNode, frag, el);
		}
		splice.apply(this.masterNodeList, [
			masterListIndex,
			0
		].concat(newNodeLists));

		// update indices after insert point
		splice.apply(this.indexMap, [
			index,
			0
		].concat(newIndicies));

		for (var i = index + newIndicies.length, len = this.indexMap.length; i < len; i++) {
			this.indexMap[i].set(i);
		}
	},
	remove: function(items, index) {
		//if (!afterPreviousEvents) {
		//	return;
		//}

		// If this is because an element was removed, we should
		// check to make sure the live elements are still in the page.
		// If we did this during a teardown, it would cause an infinite loop.
		//if (!duringTeardown && this.data.teardownCheck(this.placeholder.parentNode)) {
		//	return;
		//}
		if (index < 0) {
			index = this.indexMap.length + index;
		}
		var itemsToRemove = removeFromNodeList(this.masterNodeList, index, items.length);
		var indexMap = this.indexMap;
		// update indices after remove point
		indexMap.splice(index, items.length);
		for (var i = index, len = indexMap.length; i < len; i++) {
			indexMap[i].set(i);
		}

		// don't remove elements during teardown.  Something else will probably be doing that.
		if (!this.exit) {
			// adds the falsey section if the list is empty
			this.addFalseyIfEmpty();
			nodeLists.remove(itemsToRemove);
		} else {
			nodeLists.unregister(this.masterNodeList);
		}
	},
	// #### addFalseyIfEmpty
	// Add the results of redering the "falsey" or inverse case render to the
	// master nodeList and the DOM if the live list is empty
	addFalseyIfEmpty: function() {
		if (this.falseyRender && this.indexMap.length === 0) {
			// If there are no items ... we should render the falsey template
			var falseyNodeLists = [];
			var falseyFrag = renderAndAddToNodeLists(falseyNodeLists, this.masterNodeList, this.falseyRender, this.currentList, [this.currentList]);

			// put the frag after the reference element in the associated nodeList
			nodeLists.after([this.masterNodeList[0]], falseyFrag);
			// and push the first element onto the master list
			this.masterNodeList.push(falseyNodeLists[0]);
		}
	},
	move: function move(newIndex, currentIndex) {
		//if (!afterPreviousEvents) {
		//	return;
		//}
		// The position of elements is always after the initial text
		// placeholder node
		newIndex = newIndex + 1;
		currentIndex = currentIndex + 1;
		var masterNodeList = this.masterNodeList,
			indexMap = this.indexMap;
		var referenceNodeList = masterNodeList[newIndex];
		var movedElements = frag(nodeLists.flatten(masterNodeList[currentIndex]));
		var referenceElement;

		// If we're moving forward in the list, we want to be placed before
		// the item AFTER the target index since removing the item from
		// the currentIndex drops the referenceItem's index. If there is no
		// nextSibling, insertBefore acts like appendChild.
		if (currentIndex < newIndex) {
			referenceElement = nodeLists.last(referenceNodeList).nextSibling;
		} else {
			referenceElement = nodeLists.first(referenceNodeList);
		}

		var parentNode = masterNodeList[0].parentNode;

		// Move the DOM nodes into the proper location
		parentNode.insertBefore(movedElements, referenceElement);

		// Now, do the same for the masterNodeList. We need to keep it
		// in sync with the DOM.

		// Save a reference to the "node" that we're manually moving
		var temp = masterNodeList[currentIndex];

		// Remove the movedItem from the masterNodeList
		[].splice.apply(masterNodeList, [currentIndex, 1]);

		// Move the movedItem to the correct index in the masterNodeList
		[].splice.apply(masterNodeList, [newIndex, 0, temp]);

		// Convert back to a zero-based array index
		newIndex = newIndex - 1;
		currentIndex = currentIndex - 1;

		// Grab the index compute from the `indexMap`
		var indexCompute = indexMap[currentIndex];

		// Remove the index compute from the `indexMap`
		[].splice.apply(indexMap, [currentIndex, 1]);

		// Move the index compute to the correct index in the `indexMap`
		[].splice.apply(indexMap, [newIndex, 0, indexCompute]);

		var i = Math.min(currentIndex, newIndex);
		var len = indexMap.length;

		for (i, len; i < len; i++) {
			// set each compute to have its current index in the map as its value
			indexMap[i].set(i);
		}
	},
	set: function(newVal, index) {
		this.remove({
			length: 1
		}, index, true);
		this.add([newVal], index);
	}
};



/**
 * @function can-view-live.list list
 * @parent can-view-live
 * @release 2.0.4
 *
 * @signature `live.list(el, list, render, context, [parentNode])`
 *
 * Live binds a compute's list incrementally.
 *
 * ```js
 * // a compute that change's it's list
 * var todos = compute(function(){
 *   return new Todo.List({page: can.route.attr("page")})
 * })
 *
 * var placeholder = document.createTextNode(" ");
 * $("ul#todos").append(placeholder);
 *
 * can.view.live.list(
 *   placeholder,
 *   todos,
 *   function(todo, index){
 *     return "<li>"+todo.attr("name")+"</li>"
 *   });
 * ```
 *
 * @param {HTMLElement} el An html element to replace with the live-section.
 *
 * @param {Object} list An observable value or list type. If an observable value, it should contain
 * a falsey value or a list type.
 *
 * @param {function(this:*,*,index):String} render(index, index) A function that when called with
 * the incremental item to render and the index of the item in the list.
 *
 * @param {Object} context The `this` the `render` function will be called with.
 *
 * @param {HTMLElement} [parentNode] An overwritable parentNode if `el`'s parent is
 * a documentFragment.
 *
 * @body
 *
 * ## How it works
 *
 * If `list` is an observable value, `live.list` listens to changes in in that
 * observable value.  It will generally change from one list type (often a list type that implements `onPatches`)
 * to another.  When the value changes, a diff will be performed and the DOM updated.  Also, `live.list`
 * will listen to `.onPatches` on the new list and apply any patches emitted from it.
 *
 *
 */
live.list = function(el, list, render, context, parentNode, nodeList, falseyRender) {
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
	new ListDOMPatcher(el, list, render, context, parentNode, nodeList, falseyRender);
};
