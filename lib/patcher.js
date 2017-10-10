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

var Patcher = function(observableOrList) {
    this.handlers = new KeyTree([Object, Array],{
        onFirst: this.setup.bind(this),
        onEmpty: this.teardown.bind(this)
    });

    this.observableOrList = observableOrList;
    this.isObservableValue = canReflect.isValueLike(this.observableOrList) || canReflect.isObservableLike(this.observableOrList);
    this.onList = this.onList.bind(this);
    this.onPatches = this.onPatches.bind(this);
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
			list[onPatchesSymbol](this.onPatches,"notify");
		}
    },
    onList: function(newList){
        var current = this.currentList || [];

        if ( current[offPatchesSymbol] ) {
            current[offPatchesSymbol](this.onPatches,"notify");
        }
        var patches = diff(current, newList);
        this.currentList = newList;
        this.onPatches(patches);
        if (newList[onPatchesSymbol]) {
			// If observable, set up bindings on list changes
			newList[onPatchesSymbol](this.onPatches,"notify");
		}
	},
    onPatches: function(patches){
        queues.enqueueByQueue(this.handlers.getNode([]), this.currentList, [patches, this.currentList], function(){
            // TODO
            return {};
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
