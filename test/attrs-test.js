var live = require('can-view-live');
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var SimpleObservable = require("can-simple-observable");
var queues = require("can-queues");
var domMutate = require('can-dom-mutate');
var domMutateNode = require('can-dom-mutate/node');
var testHelpers = require('can-test-helpers');
var canReflectDeps = require('can-reflect-dependencies');

QUnit.module("can-view-live.attrs",{
    setup: function(){
		this.fixture = document.getElementById('qunit-fixture');
	}
});

QUnit.test('basics', function () {
	var div = document.createElement('div');
    var property = new SimpleObservable("class"),
        value = new SimpleObservable("foo");

	var text = new Observation(function () {
		var html = '';
		if (property.get() && value.get()) {
			html += property.get() + '=\'' + value.get() + '\'';
		}
		return html;
	});
	live.attrs(div, text);
	equal(div.className, 'foo');
	property.set(null);
	equal(div.className, '');
    queues.batch.start();
    property.set('foo');
    value.set('bar');
    queues.batch.stop();
	equal(div.getAttribute('foo'), 'bar');
});

QUnit.test('should remove `removed` events listener', function (assert) {
	var done = assert.async();
	var onNodeRemoval = domMutate.onNodeRemoval;

	domMutate.onNodeRemoval = function () {
		assert.ok(true, 'addEventListener called');
		var disposal = onNodeRemoval.apply(null, arguments);
		domMutate.onNodeRemoval = onNodeRemoval;
		return function () {
			assert.ok(true, 'disposal function was called');
			disposal();
			done();
		};
	};

	var div = document.createElement('div');
	var text = new SimpleObservable('hello');

	domMutateNode.appendChild.call(this.fixture, div);
	live.attrs(div, text);
	domMutateNode.removeChild.call(this.fixture, div);
});

testHelpers.dev.devOnlyTest('can-reflect-dependencies', function(assert) {
	var done = assert.async();
	assert.expect(3);

	var div = document.createElement('div');
	document.body.appendChild(div);

	var attr = new SimpleObservable('class');
	var value = new SimpleObservable('foo');

	var text = new Observation(function() {
		var html = '';
		if (attr.get() && value.get()) {
			html += attr.get() + '="' + value.get() + '"';
		}
		return html;
	});

	live.attrs(div, text);

	assert.deepEqual(
		canReflectDeps
			.getDependencyDataOf(div)
			.whatChangesMe
			.mutate
			.valueDependencies,
		new Set([text]),
		'getDependencyDataOf(<div>) should return the observation as a dependency'
	);

	assert.deepEqual(
		canReflectDeps
			.getDependencyDataOf(text)
			.whatIChange
			.mutate
			.valueDependencies,
		new Set([div]),
		'getDependencyDataOf(observation) should return the div as a dependency'
	);

	var undo = domMutate.onNodeRemoval(div, function checkTeardown () {
		undo();

		assert.equal(
			typeof canReflectDeps.getDependencyDataOf(div),
			'undefined',
			'dependencies should be cleared out when element is removed'
		);

		done();
	});

	div.parentNode.removeChild(div);
});

if(window.document && document.contains) {
	QUnit.test('use document contains if possible', function (assert) {
		var done = assert.async();
		// overwrite domMutate call
		var onNodeRemoval = domMutate.onNodeRemoval;
		domMutate.onNodeRemoval = function () {
			var disposal = onNodeRemoval.apply(null, arguments);
			domMutate.onNodeRemoval = onNodeRemoval;
			return function () {
				disposal();
				done();
			};
		};
		// overwrite document.contains
		var contains = document.contains;
		document.contains = function(){
			assert.ok(true, "contains was called");
			var result = contains.apply(this, arguments);
			document.contains = contains;
			return result;
		};

		var div = document.createElement('div');
		var text = new SimpleObservable('hello');

		domMutateNode.appendChild.call(this.fixture, div);
		live.attrs(div, text);
		domMutateNode.removeChild.call(this.fixture, div);
	});
}
