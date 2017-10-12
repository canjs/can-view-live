var canReflect = require("can-reflect");
var KeyTree = require("can-key-tree");
var canSymbol = require("can-symbol");
var diff = require('can-util/js/diff/diff');
var queues = require("can-queues");
var canSymbol = require("can-symbol");

var onValueSymbol = canSymbol.for("can.onValue"),
    offValueSymbol = canSymbol.for("can.offValue");
var onPatchesSymbol = canSymbol.for("can.onPatches");
var offPatchesSymbol = canSymbol.for("can.offPatches");

var Patcher = function(observableOrList, priority) {
    this.handlers = new KeyTree([Object, Array],{
        onFirst: this.setup.bind(this),
        onEmpty: this.teardown.bind(this)
    });

    this.observableOrList = observableOrList;
    this.isObservableValue = canReflect.isValueLike(this.observableOrList) || canReflect.isObservableLike(this.observableOrList);
    /*if(this.isObservableValue) {
        debugger;
    } else {
        this.priority = priority || 0;
    }*/
    this.onList = this.onList.bind(this);
    this.onPatchesNotify = this.onPatchesNotify.bind(this);
    this.patches = [];
};


Patcher.prototype = {
    constructor: Patcher,
    setup: function () {
        if (this.observableOrList[onValueSymbol]) {
            canReflect.onValue(this.observableOrList, this.onList,"notify");
            this.setupList(canReflect.getValue(this.observableOrList));
        } else {
            this.setupList(this.observableOrList || []);
        }
    },
    teardown: function(){
        if (this.isObservableValue[offValueSymbol]) {
            canReflect.offValue(this.observableOrList, this.onList,"notify");
        }
    },
    setupList: function(list) {
        this.currentList = list;
        if (list[onPatchesSymbol]) {
			// If observable, set up bindings on list changes
			list[onPatchesSymbol](this.onPatchesNotify,"notify");
		}
    },
    onList: function onList(newList){
        var current = this.currentList || [];

        if ( current[offPatchesSymbol] ) {
            current[offPatchesSymbol](this.onPatchesNotify,"notify");
        }
        var patches = diff(current, newList);
        this.currentList = newList;
        this.onPatchesNotify(patches);
        if (newList[onPatchesSymbol]) {
			// If observable, set up bindings on list changes
			newList[onPatchesSymbol](this.onPatchesNotify,"notify");
		}
	},
    // this is when we get notified of patches
    // but we really want the mutations to the dom to be enqueued in the right order
    onPatchesNotify: function onPatchesNotify(patches){
        // we are going to collect all patches
        this.patches.push.apply(this.patches, patches);
        // TODO: share priority
		queues.deriveQueue.enqueue(this.onPatchesDerive, this, [] ,{priority: 2});
	},
    onPatchesDerive: function onPatchesDerive(){
        var patches = this.patches;
        this.patches = [];
        queues.enqueueByQueue(this.handlers.getNode([]), this.currentList, [patches, this.currentList], function(fn, context, args){
            return {log: [fn.name, "for", args[0]]};
        });
    }
};

canReflect.assignSymbols(Patcher.prototype,{
    "can.onPatches": function(handler, queue){
        this.handlers.add([queue || "mutate", handler]);
    },
    "can.offPatches": function(handler, queue){
        this.handlers.delete([queue || "mutate", handler]);
    }
});

module.exports = Patcher;
