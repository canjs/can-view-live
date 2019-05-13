var domMutateNode = require('can-dom-mutate/node');
var domMutate = require("can-dom-mutate");

module.exports = {
	range: {
		create: function(el, rangeName){
			var start, end, next;

			if(el.nodeType === Node.COMMENT_NODE) {
				start = el;
				next = el.nextSibling;
				if(next.nodeType === Node.COMMENT_NODE && next.nodeValue === "can-end-placeholder") {
					end = next;
					end.nodeValue = start.nodeValue = rangeName;
				}
			} else {
				start = el.ownerDocument.createComment( rangeName );
				el.parentNode.replaceChild( start, el );
			}

			if(!end) {
				end = el.ownerDocument.createComment( rangeName );
				start.parentNode.insertBefore(end, end.nextSibling);
			}

			return {start: start, end: end};
		},
		remove: function ( range ) {

			// remove from the end
			var parentNode = range.start.parentNode,
				cur = range.end.previousSibling,
				remove;
			while(cur !== range.start) {
				remove = cur;
				cur = cur.previousSibling;
				domMutateNode.removeChild.call(parentNode, remove );
			}

			domMutate.flushRecords();
		},

		update: function ( range, frag ) {
			var parentNode = range.start.parentNode;

			// TODO: Remove in production
			if(range.start.nextSibling !== range.end) {
				throw new Error("range not empty")
			}

			domMutateNode.insertBefore.call(parentNode, frag, range.end);
			//domMutate.flushRecords();
		}
	}
};
