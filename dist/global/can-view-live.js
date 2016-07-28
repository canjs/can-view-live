/*[global-shim-start]*/
(function(exports, global, doEval){ // jshint ignore:line
	var origDefine = global.define;

	var get = function(name){
		var parts = name.split("."),
			cur = global,
			i;
		for(i = 0 ; i < parts.length; i++){
			if(!cur) {
				break;
			}
			cur = cur[parts[i]];
		}
		return cur;
	};
	var modules = (global.define && global.define.modules) ||
		(global._define && global._define.modules) || {};
	var ourDefine = global.define = function(moduleName, deps, callback){
		var module;
		if(typeof deps === "function") {
			callback = deps;
			deps = [];
		}
		var args = [],
			i;
		for(i =0; i < deps.length; i++) {
			args.push( exports[deps[i]] ? get(exports[deps[i]]) : ( modules[deps[i]] || get(deps[i]) )  );
		}
		// CJS has no dependencies but 3 callback arguments
		if(!deps.length && callback.length) {
			module = { exports: {} };
			var require = function(name) {
				return exports[name] ? get(exports[name]) : modules[name];
			};
			args.push(require, module.exports, module);
		}
		// Babel uses the exports and module object.
		else if(!args[0] && deps[0] === "exports") {
			module = { exports: {} };
			args[0] = module.exports;
			if(deps[1] === "module") {
				args[1] = module;
			}
		} else if(!args[0] && deps[0] === "module") {
			args[0] = { id: moduleName };
		}

		global.define = origDefine;
		var result = callback ? callback.apply(null, args) : undefined;
		global.define = ourDefine;

		// Favor CJS module.exports over the return value
		modules[moduleName] = module && module.exports ? module.exports : result;
	};
	global.define.orig = origDefine;
	global.define.modules = modules;
	global.define.amd = true;
	ourDefine("@loader", [], function(){
		// shim for @@global-helpers
		var noop = function(){};
		return {
			get: function(){
				return { prepareGlobal: noop, retrieveGlobal: noop };
			},
			global: global,
			__exec: function(__load){
				doEval(__load.source, global);
			}
		};
	});
}
)({},window,function(__$source__, __$global__) { // jshint ignore:line
	eval("(function() { " + __$source__ + " \n }).call(__$global__);");
}
)
/*can-view-live@3.0.0-pre.3#lib/core*/
define('can-view-live/lib/core', function (require, exports, module) {
    var parser = require('can-view-parser');
    var domEvents = require('can-util/dom/events/events');
    var nodeLists = require('can-view-nodelist');
    var makeFrag = require('can-util/dom/frag/frag');
    var childNodes = require('can-util/dom/child-nodes/child-nodes');
    require('can-util/dom/events/removed/removed');
    var childMutationCallbacks = {};
    var live = {
        setup: function (el, bind, unbind) {
            var tornDown = false, teardown = function () {
                    if (!tornDown) {
                        tornDown = true;
                        unbind(data);
                        domEvents.removeEventListener.call(el, 'removed', teardown);
                    }
                    return true;
                }, data = {
                    teardownCheck: function (parent) {
                        return parent ? false : teardown();
                    }
                };
            domEvents.addEventListener.call(el, 'removed', teardown);
            bind(data);
            return data;
        },
        listen: function (el, compute, change) {
            return live.setup(el, function () {
                compute.computeInstance.addEventListener('change', change);
            }, function (data) {
                compute.computeInstance.removeEventListener('change', change);
                if (data.nodeList) {
                    nodeLists.unregister(data.nodeList);
                }
            });
        },
        getAttributeParts: function (newVal) {
            var attrs = {}, attr;
            parser.parseAttrs(newVal, {
                attrStart: function (name) {
                    attrs[name] = '';
                    attr = name;
                },
                attrValue: function (value) {
                    attrs[attr] += value;
                },
                attrEnd: function () {
                }
            });
            return attrs;
        },
        isNode: function (obj) {
            return obj && obj.nodeType;
        },
        addTextNodeIfNoChildren: function (frag) {
            if (!frag.firstChild) {
                frag.appendChild(frag.ownerDocument.createTextNode(''));
            }
        },
        registerChildMutationCallback: function (tag, callback) {
            if (callback) {
                childMutationCallbacks[tag] = callback;
            } else {
                return childMutationCallbacks[tag];
            }
        },
        callChildMutationCallback: function (el) {
            var callback = el && childMutationCallbacks[el.nodeName.toLowerCase()];
            if (callback) {
                callback(el);
            }
        },
        replace: function (nodes, val, teardown) {
            var oldNodes = nodes.slice(0), frag = makeFrag(val);
            nodeLists.register(nodes, teardown);
            nodeLists.update(nodes, childNodes(frag));
            nodeLists.replace(oldNodes, frag);
            return nodes;
        },
        getParentNode: function (el, defaultParentNode) {
            return defaultParentNode && el.parentNode.nodeType === 11 ? defaultParentNode : el.parentNode;
        },
        makeString: function (txt) {
            return txt == null ? '' : '' + txt;
        }
    };
    module.exports = live;
});
/*can-view-live@3.0.0-pre.3#lib/attr*/
define('can-view-live/lib/attr', function (require, exports, module) {
    var attr = require('can-util/dom/attr/attr');
    var live = require('can-view-live/lib/core');
    live.attr = function (el, attributeName, compute) {
        live.listen(el, compute, function (ev, newVal) {
            attr.set(el, attributeName, newVal);
        });
        attr.set(el, attributeName, compute());
    };
});
/*can-view-live@3.0.0-pre.3#lib/attrs*/
define('can-view-live/lib/attrs', function (require, exports, module) {
    var live = require('can-view-live/lib/core');
    var viewCallbacks = require('can-view-callbacks');
    var attr = require('can-util/dom/attr/attr');
    var domEvents = require('can-util/dom/events/events');
    var types = require('can-util/js/types/types');
    live.attrs = function (el, compute, scope, options) {
        if (!types.isCompute(compute)) {
            var attrs = live.getAttributeParts(compute);
            for (var name in attrs) {
                attr.set(el, name, attrs[name]);
            }
            return;
        }
        var oldAttrs = {};
        var setAttrs = function (newVal) {
            var newAttrs = live.getAttributeParts(newVal), name;
            for (name in newAttrs) {
                var newValue = newAttrs[name], oldValue = oldAttrs[name];
                if (newValue !== oldValue) {
                    attr.set(el, name, newValue);
                    var callback = viewCallbacks.attr(name);
                    if (callback) {
                        callback(el, {
                            attributeName: name,
                            scope: scope,
                            options: options
                        });
                    }
                }
                delete oldAttrs[name];
            }
            for (name in oldAttrs) {
                attr.remove(el, name);
            }
            oldAttrs = newAttrs;
        };
        var handler = function (ev, newVal) {
            setAttrs(newVal);
        };
        compute.addEventListener('change', handler);
        domEvents.addEventListener.call(el, 'removed', function () {
            compute.removeEventListener('change', handler);
        });
        setAttrs(compute());
    };
});
/*can-view-live@3.0.0-pre.3#lib/html*/
define('can-view-live/lib/html', function (require, exports, module) {
    var live = require('can-view-live/lib/core');
    var nodeLists = require('can-view-nodelist');
    var makeFrag = require('can-util/dom/frag/frag');
    var makeArray = require('can-util/js/make-array/make-array');
    var childNodes = require('can-util/dom/child-nodes/child-nodes');
    live.html = function (el, compute, parentNode, nodeList) {
        var data;
        parentNode = live.getParentNode(el, parentNode);
        data = live.listen(parentNode, compute, function (ev, newVal, oldVal) {
            var attached = nodeLists.first(nodes).parentNode;
            if (attached) {
                makeAndPut(newVal);
            }
            var pn = nodeLists.first(nodes).parentNode;
            data.teardownCheck(pn);
            live.callChildMutationCallback(pn);
        });
        var nodes = nodeList || [el], makeAndPut = function (val) {
                var isFunction = typeof val === 'function', aNode = live.isNode(val), frag = makeFrag(isFunction ? '' : val), oldNodes = makeArray(nodes);
                live.addTextNodeIfNoChildren(frag);
                oldNodes = nodeLists.update(nodes, childNodes(frag));
                if (isFunction) {
                    val(frag.firstChild);
                }
                nodeLists.replace(oldNodes, frag);
            };
        data.nodeList = nodes;
        if (!nodeList) {
            nodeLists.register(nodes, data.teardownCheck);
        } else {
            nodeList.unregistered = data.teardownCheck;
        }
        makeAndPut(compute());
    };
});
/*can-view-live@3.0.0-pre.3#lib/list*/
define('can-view-live/lib/list', function (require, exports, module) {
    var live = require('can-view-live/lib/core');
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
        var masterNodeList = nodeList || [el], indexMap = [], afterPreviousEvents = false, isTornDown = false, add = function (ev, items, index) {
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
            }, set = function (ev, newVal, index) {
                remove({}, { length: 1 }, index, true);
                add({}, [newVal], index);
            }, remove = function (ev, items, index, duringTeardown, fullTeardown) {
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
            }, move = function (ev, item, newIndex, currentIndex) {
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
});
/*can-view-live@3.0.0-pre.3#lib/text*/
define('can-view-live/lib/text', function (require, exports, module) {
    var live = require('can-view-live/lib/core');
    var nodeLists = require('can-view-nodelist');
    live.text = function (el, compute, parentNode, nodeList) {
        var parent = live.getParentNode(el, parentNode);
        var data = live.listen(parent, compute, function (ev, newVal, oldVal) {
            if (typeof node.nodeValue !== 'unknown') {
                node.nodeValue = live.makeString(newVal);
            }
            data.teardownCheck(node.parentNode);
        });
        var node = el.ownerDocument.createTextNode(live.makeString(compute()));
        if (nodeList) {
            nodeList.unregistered = data.teardownCheck;
            data.nodeList = nodeList;
            nodeLists.update(nodeList, [node]);
            nodeLists.replace([el], node);
        } else {
            data.nodeList = live.replace([el], node, data.teardownCheck);
        }
    };
});
/*can-view-live@3.0.0-pre.3#can-view-live*/
define('can-view-live', function (require, exports, module) {
    var live = require('can-view-live/lib/core');
    require('can-view-live/lib/attr');
    require('can-view-live/lib/attrs');
    require('can-view-live/lib/html');
    require('can-view-live/lib/list');
    require('can-view-live/lib/text');
    module.exports = live;
});
/*[global-shim-end]*/
(function(){ // jshint ignore:line
	window._define = window.define;
	window.define = window.define.orig;
}
)();