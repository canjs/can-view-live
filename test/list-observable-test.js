var live = require("can-view-live");
var ObservableArray = require("can-observable-array");
var QUnit = require("steal-qunit");
var domMutate = require("can-dom-mutate");
var domMutateNode = require("can-dom-mutate/node");
var globals = require("can-globals");

QUnit.module("can-view-live.list with ObservableArray", {
	beforeEach: function() {
		this.fixture = document.getElementById("qunit-fixture");
	}
});

QUnit.test("live.list should handle items being spliced out of a list twice (#151)", function(assert) {
	var div = document.createElement("div"),
		list = new ObservableArray([ "sloth", "bear"	]),
		template = function (animal) {
			return "<label>Animal=</label> <span>" + animal.get() + "</span>";
		};
	div.innerHTML = "my <b>fav</b> animals: <span></span> !";
	var el = div.getElementsByTagName("span")[0];

	live.list(el, list, template, {});

	assert.equal(div.getElementsByTagName("label").length, 2, "There are 2 labels");

	try {
		list.splice(0, 2);
		list.splice(0, 2);
		assert.equal(div.getElementsByTagName("label").length, 0, "There are 0 labels");
	} catch(e) {
		assert.ok(false, e);
	}
});
