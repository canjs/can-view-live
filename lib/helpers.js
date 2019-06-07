var domMutateNode = require('can-dom-mutate/node');
var domMutate = require("can-dom-mutate");
var canSymbol = require("can-symbol");
var canReflect = require("can-reflect");
var canReflectDeps = require('can-reflect-dependencies');
var canDev = require("can-log/dev/dev");

var setElementSymbol = canSymbol.for("can.setElement");

function ListenUntilRemovedAndInitialize(observable, handler, placeholder, queueName, handlerName){
	this.observable = observable;
	this.handler = handler;
	this.placeholder = placeholder;
	this.queueName = queueName;

	if( observable[setElementSymbol] ) {
		observable[setElementSymbol](placeholder);
	} else {
		console.warn("no can.setElement symbol on observable", observable);
	}

	//!steal-remove-start
	if(process.env.NODE_ENV !== 'production') {
		// register that the handler changes the parent element
		canReflect.assignSymbols(handler, {
			"can.getChangesDependencyRecord": function() {
				var s = new Set();
				s.add(placeholder);
				return {
					valueDependencies: s
				};
			}
		});

		Object.defineProperty(handler, "name", {
			value: handlerName,
		});

		canReflectDeps.addMutatedBy(placeholder, observable);
	}
	//!steal-remove-end

	this.teardownNodeRemoved = domMutate.onNodeRemoved(placeholder,
		this.teardown.bind(this));

	canReflect.onValue(observable, handler, queueName);

	// data = live.listen(parentNode, compute, liveHTMLUpdateHTML);
	handler(  canReflect.getValue(observable) );
}
ListenUntilRemovedAndInitialize.prototype.teardown = function(){
	this.teardownNodeRemoved();
	//!steal-remove-start
	if(process.env.NODE_ENV !== 'production') {
		canReflectDeps.deleteMutatedBy(this.placeholder, this.observable);
	}
	//!steal-remove-end
	canReflect.offValue(this.observable, this.handler, this.queueName);
};


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
				canDev.warn("can-view-live: forcing a comment range for ", rangeName, el);
				start = el.ownerDocument.createComment( rangeName );
				el.parentNode.replaceChild( start, el );
			}

			if(!end) {
				end = el.ownerDocument.createComment( rangeName );
				start.parentNode.insertBefore(end, start.nextSibling);
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
			//if(range.start.nextSibling !== range.end) {
			//	throw new Error("range not empty")
			//}

			domMutateNode.insertBefore.call(parentNode, frag, range.end);
			//domMutate.flushRecords();
		}
	},
	ListenUntilRemovedAndInitialize: ListenUntilRemovedAndInitialize
};
