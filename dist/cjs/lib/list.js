/*can-view-live@3.0.4#lib/list*/
var live = require('./core.js');
var makeRunInOrder = require('./util/runInOrder.js');
var runInOrder = makeRunInOrder();
var nodeLists = require('can-view-nodelist');
var makeCompute = require('can-compute');
var canBatch = require('can-event/batch/batch');
var frag = require('can-util/dom/frag/frag');
var domMutate = require('can-util/dom/mutate/mutate');
var childNodes = require('can-util/dom/child-nodes/child-nodes');
var makeArray = require('can-util/js/make-array/make-array');
var each = require('can-util/js/each/each');
var isFunction = require('can-util/js/is-function/is-function');
var diff = require('can-util/js/diff/diff');
var splice = [].splice;
var renderAndAddToNodeLists = function (newNodeLists, parentNodeList, render, context, args) {
        var itemNodeList = [];
        if (parentNodeList) {
            nodeLists.register(itemNodeList, null, parentNodeList, true);
            itemNodeList.parentList = parentNodeList;
            itemNodeList.expression = '#each SUBEXPRESSION';
        }
        var itemHTML = render.apply(context, args.concat([itemNodeList])), itemFrag = frag(itemHTML);
        var children = makeArray(childNodes(itemFrag));
        if (parentNodeList) {
            nodeLists.update(itemNodeList, children);
            newNodeLists.push(itemNodeList);
        } else {
            newNodeLists.push(nodeLists.register(children));
        }
        return itemFrag;
    }, removeFromNodeList = function (masterNodeList, index, length) {
        var removedMappings = masterNodeList.splice(index + 1, length), itemsToRemove = [];
        each(removedMappings, function (nodeList) {
            var nodesToRemove = nodeLists.unregister(nodeList);
            [].push.apply(itemsToRemove, nodesToRemove);
        });
        return itemsToRemove;
    }, addFalseyIfEmpty = function (list, falseyRender, masterNodeList, nodeList) {
        if (falseyRender && list.length === 0) {
            var falseyNodeLists = [];
            var falseyFrag = renderAndAddToNodeLists(falseyNodeLists, nodeList, falseyRender, list, [list]);
            nodeLists.after([masterNodeList[0]], falseyFrag);
            masterNodeList.push(falseyNodeLists[0]);
        }
    };
live.list = function (el, compute, render, context, parentNode, nodeList, falseyRender) {
    var masterNodeList = nodeList || [el], indexMap = [], afterPreviousEvents = false, isTornDown = false, add = runInOrder(function add(ev, items, index) {
            if (!afterPreviousEvents) {
                return;
            }
            var frag = text.ownerDocument.createDocumentFragment(), newNodeLists = [], newIndicies = [];
            each(items, function (item, key) {
                var itemIndex = makeCompute(key + index), itemCompute = makeCompute(function (newVal) {
                        if (arguments.length) {
                            if ('set' in list) {
                                list.set(itemIndex(), newVal);
                            } else {
                                list.attr(itemIndex(), newVal);
                            }
                        } else {
                            return item;
                        }
                    }), itemFrag = renderAndAddToNodeLists(newNodeLists, nodeList, render, context, [
                        itemCompute,
                        itemIndex
                    ]);
                frag.appendChild(itemFrag);
                newIndicies.push(itemIndex);
            });
            var masterListIndex = index + 1;
            if (!indexMap.length) {
                var falseyItemsToRemove = removeFromNodeList(masterNodeList, 0, masterNodeList.length - 1);
                nodeLists.remove(falseyItemsToRemove);
            }
            if (!masterNodeList[masterListIndex]) {
                nodeLists.after(masterListIndex === 1 ? [text] : [nodeLists.last(masterNodeList[masterListIndex - 1])], frag);
            } else {
                var el = nodeLists.first(masterNodeList[masterListIndex]);
                domMutate.insertBefore.call(el.parentNode, frag, el);
            }
            splice.apply(masterNodeList, [
                masterListIndex,
                0
            ].concat(newNodeLists));
            splice.apply(indexMap, [
                index,
                0
            ].concat(newIndicies));
            for (var i = index + newIndicies.length, len = indexMap.length; i < len; i++) {
                indexMap[i](i);
            }
            if (ev.callChildMutationCallback !== false) {
                live.callChildMutationCallback(text.parentNode);
            }
        }), set = function (ev, newVal, index) {
            remove({}, { length: 1 }, index, true);
            add({}, [newVal], index);
        }, remove = runInOrder(function remove(ev, items, index, duringTeardown, fullTeardown) {
            if (!afterPreviousEvents) {
                return;
            }
            if (!duringTeardown && data.teardownCheck(text.parentNode)) {
                return;
            }
            if (index < 0) {
                index = indexMap.length + index;
            }
            var itemsToRemove = removeFromNodeList(masterNodeList, index, items.length);
            indexMap.splice(index, items.length);
            for (var i = index, len = indexMap.length; i < len; i++) {
                indexMap[i](i);
            }
            if (!fullTeardown) {
                addFalseyIfEmpty(list, falseyRender, masterNodeList, nodeList);
                nodeLists.remove(itemsToRemove);
                if (ev.callChildMutationCallback !== false) {
                    live.callChildMutationCallback(text.parentNode);
                }
            } else {
                nodeLists.unregister(masterNodeList);
            }
        }), move = function (ev, item, newIndex, currentIndex) {
            if (!afterPreviousEvents) {
                return;
            }
            newIndex = newIndex + 1;
            currentIndex = currentIndex + 1;
            var referenceNodeList = masterNodeList[newIndex];
            var movedElements = frag(nodeLists.flatten(masterNodeList[currentIndex]));
            var referenceElement;
            if (currentIndex < newIndex) {
                referenceElement = nodeLists.last(referenceNodeList).nextSibling;
            } else {
                referenceElement = nodeLists.first(referenceNodeList);
            }
            var parentNode = masterNodeList[0].parentNode;
            parentNode.insertBefore(movedElements, referenceElement);
            var temp = masterNodeList[currentIndex];
            [].splice.apply(masterNodeList, [
                currentIndex,
                1
            ]);
            [].splice.apply(masterNodeList, [
                newIndex,
                0,
                temp
            ]);
            newIndex = newIndex - 1;
            currentIndex = currentIndex - 1;
            var indexCompute = indexMap[currentIndex];
            [].splice.apply(indexMap, [
                currentIndex,
                1
            ]);
            [].splice.apply(indexMap, [
                newIndex,
                0,
                indexCompute
            ]);
            var i = Math.min(currentIndex, newIndex);
            var len = indexMap.length;
            for (i, len; i < len; i++) {
                indexMap[i](i);
            }
            if (ev.callChildMutationCallback !== false) {
                live.callChildMutationCallback(text.parentNode);
            }
        }, text = el.ownerDocument.createTextNode(''), list, teardownList = function (fullTeardown) {
            if (list && list.removeEventListener) {
                list.removeEventListener('add', add);
                list.removeEventListener('set', set);
                list.removeEventListener('remove', remove);
                list.removeEventListener('move', move);
            }
            remove({ callChildMutationCallback: !!fullTeardown }, { length: masterNodeList.length - 1 }, 0, true, fullTeardown);
        }, updateList = function (ev, newList, oldList) {
            if (isTornDown) {
                return;
            }
            afterPreviousEvents = true;
            if (newList && oldList) {
                list = newList || [];
                var patches = diff(oldList, newList);
                if (oldList.removeEventListener) {
                    oldList.removeEventListener('add', add);
                    oldList.removeEventListener('set', set);
                    oldList.removeEventListener('remove', remove);
                    oldList.removeEventListener('move', move);
                }
                for (var i = 0, patchLen = patches.length; i < patchLen; i++) {
                    var patch = patches[i];
                    if (patch.deleteCount) {
                        remove({ callChildMutationCallback: false }, { length: patch.deleteCount }, patch.index, true);
                    }
                    if (patch.insert.length) {
                        add({ callChildMutationCallback: false }, patch.insert, patch.index);
                    }
                }
            } else {
                if (oldList) {
                    teardownList();
                }
                list = newList || [];
                add({ callChildMutationCallback: false }, list, 0);
                addFalseyIfEmpty(list, falseyRender, masterNodeList, nodeList);
            }
            live.callChildMutationCallback(text.parentNode);
            afterPreviousEvents = false;
            if (list.addEventListener) {
                list.addEventListener('add', add);
                list.addEventListener('set', set);
                list.addEventListener('remove', remove);
                list.addEventListener('move', move);
            }
            canBatch.afterPreviousEvents(function () {
                afterPreviousEvents = true;
            });
        };
    parentNode = live.getParentNode(el, parentNode);
    var data = live.setup(parentNode, function () {
        if (isFunction(compute)) {
            compute.addEventListener('change', updateList);
        }
    }, function () {
        if (isFunction(compute)) {
            compute.removeEventListener('change', updateList);
        }
        teardownList(true);
    });
    if (!nodeList) {
        live.replace(masterNodeList, text, data.teardownCheck);
    } else {
        nodeLists.replace(masterNodeList, text);
        nodeLists.update(masterNodeList, [text]);
        nodeList.unregistered = function () {
            data.teardownCheck();
            isTornDown = true;
        };
    }
    updateList({}, isFunction(compute) ? compute() : compute);
};