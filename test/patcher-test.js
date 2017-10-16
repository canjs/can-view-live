var live = require('can-view-live');
var DefineList = require("can-define/list/list");
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var SimpleObservable = require("can-simple-observable");
var SimpleMap = require("can-simple-map");
var canReflect = require("can-reflect");
var queues = require("can-queues");
var fragment = require('can-util/dom/fragment/fragment');
var NodeLists = require("can-view-nodelist");
var domMutate = require('can-util/dom/mutate/mutate');
var canSymbol = require("can-symbol");
var Patcher = require("../lib/patcher");

QUnit.module("can-view-live patcher",{
	setup: function(){
		this.fixture = document.getElementById("qunit-fixture");
	}
});


QUnit.test('multiple lists can be updated at once', 2, function () {
	var list = new DefineList(["a","b"]);
    var p1 = new Patcher(list),
        p2 = new Patcher(list);

    p1[canSymbol.for("can.onPatches")](function(){
        QUnit.ok(true, "called p1");
    });
    p2[canSymbol.for("can.onPatches")](function(){
        QUnit.ok(true, "called p2");
    });

    list.push("c");
});
