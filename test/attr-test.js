var live = require('can-view-live');
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var domAttr = require("can-util/dom/attr/attr");
var SimpleObservable = require("can-simple-observable");
var domEvents = require('can-util/dom/events/events');
var testHelpers = require('can-test-helpers');
var mutateDeps = require('can-reflect-mutate-dependencies');

QUnit.module("can-view-live.attr",{
    setup: function(){
		this.fixture = document.getElementById('qunit-fixture');
	}
});

QUnit.test('basics', function () {
	var div = document.createElement('div');

	var firstValue = new SimpleObservable(null);
	var first = new Observation(function () {
		return firstValue.get() ? 'selected' : '';
	});
	var secondValue = new SimpleObservable(null);
	var second = new Observation(function () {
		return secondValue.get() ? 'active' : '';
	});
	var className = new Observation(function(){
		return "foo "+first.get() + " "+ second.get()+" end";
	});

	live.attr(div, 'class', className);

	equal(div.className, 'foo   end');
	firstValue.set(true);
	equal(div.className, 'foo selected  end');
	secondValue.set(true);
	equal(div.className, 'foo selected active end');
	firstValue.set(false);
	equal(div.className, 'foo  active end');
});

QUnit.test('specialAttribute with new line', function () {
	var div = document.createElement('div');
	var style = new SimpleObservable('width: 50px;\nheight:50px;');
	live.attr(div, 'style', style);
	equal(div.style.height, '50px');
	equal(div.style.width, '50px');
});

QUnit.test("can.live.attr works with non-string attributes (#1790)", function() {
	var el = document.createElement('div'),
		attrCompute = new Observation(function() {
			return 2;
		});

	domAttr.set(el, "value", 1);
	live.attr(el, 'value', attrCompute);
	ok(true, 'No exception thrown.');
});

testHelpers.dev.devOnlyTest('mutatedValueDependencies', function(assert) {
	var done = assert.async();
	assert.expect(2);

	var div = document.createElement('div');
	document.body.appendChild(div);

	var id = new SimpleObservable('foo');
	var title = new SimpleObservable('something');

	live.attr(div, 'id', id);
	live.attr(div, 'title', title);

	assert.deepEqual(
		mutateDeps.getValueDependencies(div).mutatedValueDependencies,
		new Set([id, title]),
		'should return the two SimpleObservable as dependencies'
	);

	domEvents.addEventListener.call(div, 'removed', function checkTeardown() {
		domEvents.removeEventListener.call(div, 'removed', checkTeardown);

		assert.equal(
			typeof mutateDeps.getValueDependencies(div),
			'undefined',
			'dependencies should be cleared out when elements is removed'
		);

		done();
	});

	// remove element from the DOM
	div.remove();
});
