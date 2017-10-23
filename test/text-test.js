var live = require('can-view-live');
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var SimpleObservable = require("can-simple-observable");
var domMutate = require('can-util/dom/mutate/mutate');
var nodeLists = require('can-view-nodelist');

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
