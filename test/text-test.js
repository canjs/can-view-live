var live = require('can-view-live');
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var SimpleObservable = require("can-simple-observable");
var domMutate = require('can-dom-mutate');
var domMutateNode = require('can-dom-mutate/node');
var nodeLists = require('can-view-nodelist');
var testHelpers = require('can-test-helpers');
var canReflectDeps = require('can-reflect-dependencies');

QUnit.module("can-view-live.text", {
	setup: function() {
		this.fixture = document.getElementById('qunit-fixture');
	}
});


var esc = function(str) {
	return str.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
};

QUnit.test('text', function() {
	var div = document.createElement('div'),
		span = document.createElement('span');
	div.appendChild(span);
	var value = new SimpleObservable(['one', 'two']);

	var text = new Observation(function html() {
		var html = '';
		value.get().forEach(function(item) {
			html += '<label>' + item + '</label>';
		});
		return html;
	});
	live.text(span, text, div);
	equal(div.innerHTML, esc('<label>one</label><label>two</label>'));
	value.set(['one', 'two', 'three']);
	equal(div.innerHTML, esc('<label>one</label><label>two</label><label>three</label>'));
});

QUnit.test('text binding is memory safe (#666)', function() {
	nodeLists.nodeMap.clear();

	var div = document.createElement('div'),
		span = document.createElement('span'),
		text = new Observation(function() {
			return 'foo';
		});
	div.appendChild(span);

	domMutateNode.appendChild.call(this.fixture, div);

	live.text(span, text, div);
	domMutateNode.removeChild.call(this.fixture, div);
	stop();
	setTimeout(function() {
		ok(!nodeLists.nodeMap.size, 'nothing in nodeMap');
		start();
	}, 100);
});

testHelpers.dev.devOnlyTest('can-reflect-dependencies', function(assert) {
	var done = assert.async();
	assert.expect(3);

	var div = document.createElement('div');
	var span = document.createElement('span');

	div.appendChild(span);
	document.body.appendChild(div);

	var value = new SimpleObservable(['one', 'two']);
	var text = new Observation(function html() {
		return value.get()
			.map(function(item) {
				return '<label>' + item + '</label>';
			})
			.join('');
	});

	live.text(span, text, div);

	assert.deepEqual(
		canReflectDeps
			.getDependencyDataOf(div)
			.whatChangesMe
			.mutate
			.valueDependencies,
		new Set([text]),
		'whatChangesMe(<div>) shows the observation'
	);

	assert.deepEqual(
		canReflectDeps
			.getDependencyDataOf(text)
			.whatIChange
			.mutate
			.valueDependencies,
		new Set([div]),
		'whatChangesMe(observation) shows the <div>'
	);

	var undo = domMutate.onNodeRemoval(div, function checkTeardown () {
		undo();

		assert.equal(
			typeof canReflectDeps.getDependencyDataOf(div),
			'undefined',
			'dependencies should be clear out when elements is removed'
		);

		done();
	});

	div.remove();
});
