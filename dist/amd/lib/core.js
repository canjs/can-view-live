/*can-view-live@3.1.0-pre.4#lib/core*/
define(function (require, exports, module) {
    var parser = require('can-view-parser');
    var domEvents = require('can-util/dom/events');
    var nodeLists = require('can-view-nodelist');
    var makeFrag = require('can-util/dom/frag');
    var childNodes = require('can-util/dom/child-nodes');
    var canReflect = require('can-reflect');
    require('can-util/dom/events/removed');
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
                canReflect.onValue(compute, change);
            }, function (data) {
                canReflect.offValue(compute, change);
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