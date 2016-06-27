/*can-view-live@3.0.0-pre.1#lib/text*/
var live = require('./core.js');
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