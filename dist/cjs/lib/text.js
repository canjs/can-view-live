/*can-view-live@3.2.5#lib/text*/
var live = require('./core.js');
var nodeLists = require('can-view-nodelist');
var canReflect = require('can-reflect');
live.text = function (el, compute, parentNode, nodeList) {
    var parent = live.getParentNode(el, parentNode);
    var data = live.listen(parent, compute, function (newVal) {
        if (typeof node.nodeValue !== 'unknown') {
            node.nodeValue = live.makeString(newVal);
        }
    });
    var node = el.ownerDocument.createTextNode(live.makeString(canReflect.getValue(compute)));
    if (nodeList) {
        nodeList.unregistered = data.teardownCheck;
        data.nodeList = nodeList;
        nodeLists.update(nodeList, [node]);
        nodeLists.replace([el], node);
    } else {
        data.nodeList = live.replace([el], node, data.teardownCheck);
    }
};