var live = require('can-view-live');
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var SimpleObservable = require("can-simple-observable");
var domMutate = require('can-util/dom/mutate/mutate');
var nodeLists = require('can-view-nodelist');
var canReflect = require('can-reflect');
var domEvents = require('can-util/dom/events/events');

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

	domMutate.appendChild.call(this.fixture, div);

	live.text(span, text, div);
	domMutate.removeChild.call(this.fixture, div);
	stop();
	setTimeout(function() {
		ok(!nodeLists.nodeMap.size, 'nothing in nodeMap');
		start();
	}, 100);
});

QUnit.test('getValueDependencies', function(assert) {
	var done = assert.async();
	assert.expect(2);

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
		canReflect.getValueDependencies(div).valueDependencies,
		new Set([text])
	);

	domEvents.addEventListener.call(div, 'removed', function checkTeardown() {
		domEvents.removeEventListener.call(div, 'removed', checkTeardown);

		assert.equal(
			typeof canReflect.getValueDependencies(div),
			'undefined',
			'dependencies should be clear out when elements is removed'
		);

		done();
	});

	div.remove();
});
