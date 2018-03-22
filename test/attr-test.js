var live = require('can-view-live');
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var domMutate = require('can-dom-mutate');
var domMutateNode = require('can-dom-mutate/node');
var SimpleObservable = require("can-simple-observable");
var testHelpers = require('can-test-helpers');
var canReflectDeps = require('can-reflect-dependencies');

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

	domMutateNode.setAttribute.call(el, "value", 1);
	live.attr(el, 'value', attrCompute);
	ok(true, 'No exception thrown.');
});

testHelpers.dev.devOnlyTest('can-reflect-dependencies', function(assert) {
	var done = assert.async();
	assert.expect(4);

	var div = document.createElement('div');
	document.body.appendChild(div);

	var id = new SimpleObservable('foo');
	var title = new SimpleObservable('something');

	live.attr(div, 'id', id);
	live.attr(div, 'title', title);

	assert.deepEqual(
		canReflectDeps
			.getDependencyDataOf(div)
			.whatChangesMe
			.mutate
			.valueDependencies,
		new Set([id, title]),
		'getDependencyDataOf(<div>) should return the two SimpleObservables as dependencies'
	);

	assert.deepEqual(
		canReflectDeps
			.getDependencyDataOf(id)
			.whatIChange
			.derive
			.valueDependencies,
		new Set([div]),
		'getDependencyDataOf(id) should return the <div> as a dependency'
	);

	assert.deepEqual(
		canReflectDeps
			.getDependencyDataOf(title)
			.whatIChange
			.derive
			.valueDependencies,
		new Set([div]),
		'getDependencyDataOf(title) should return the <div> as a dependency'
	);

	var undo = domMutate.onNodeRemoval(div, function checkTeardown () {
		undo();

		assert.equal(
			typeof canReflectDeps.getDependencyDataOf(div),
			'undefined',
			'dependencies should be cleared out when elements is removed'
		);

		done();
	});

	// remove element from the DOM
	div.remove();
});

QUnit.test("can.live.attr works with value (#96)", function() {
	var el = document.createElement('input'),
		attrObservable = new SimpleObservable("Hello");

	live.attr(el, 'value', attrObservable);
	equal(el.value, "Hello", "Hello");

	attrObservable.set("Hi");
	equal(el.value, "Hi", "Hi");

	el.value = "Hey";
	equal(el.value, "Hey", "Hey");

	attrObservable.set("Aloha");
	equal(el.value, "Aloha", "Aloha");
});
