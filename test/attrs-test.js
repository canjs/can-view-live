var live = require('can-view-live');
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var SimpleObservable = require("can-simple-observable");
var queues = require("can-queues");
var domEvents = require('can-util/dom/events/events');
var domMutate = require('can-util/dom/mutate/mutate');
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

QUnit.test('should remove `removed` events listener', function () {
	QUnit.stop();
	var origAddEventListener = domEvents.addEventListener;
	var origRemoveEventListener = domEvents.removeEventListener;

	domEvents.addEventListener = function () {
		QUnit.ok(true, 'addEventListener called');
		origAddEventListener.apply(this, arguments);
		domEvents.addEventListener = origAddEventListener;
	};

	domEvents.removeEventListener = function () {
		QUnit.ok(true, 'addEventListener called');
		origRemoveEventListener.apply(this, arguments);
		domEvents.removeEventListener = origRemoveEventListener;
		QUnit.start();
	};

	var div = document.createElement('div');
	var text = new SimpleObservable('hello');

	domMutate.appendChild.call(this.fixture, div);
	live.attrs(div, text);
	domMutate.removeChild.call(this.fixture, div);
});

testHelpers.dev.devOnlyTest('can-reflect-dependencies', function(assert) {
	var done = assert.async();
	assert.expect(2);

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
		new Set([text])
	);

	domEvents.addEventListener.call(div, 'removed', function checkTeardown() {
		domEvents.removeEventListener.call(div, 'removed', checkTeardown);

		assert.equal(
			typeof canReflectDeps.getDependencyDataOf(div),
			'undefined',
			'dependencies should be cleared out when element is removed'
		);

		done();
	});

	div.remove();
});
