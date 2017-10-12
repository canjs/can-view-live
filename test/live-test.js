var live = require('can-view-live');
var compute = require('can-compute');
var Map = require('can-map');
var List = require('can-list');
var nodeLists = require('can-view-nodelist');
var canBatch = require('can-event/batch/batch');
var Observation = require("can-observation");
var domEvents = require('can-util/dom/events/events');

var QUnit = require('steal-qunit');

var isEmptyObject = require('can-util/js/is-empty-object/is-empty-object');

var domMutate = require('can-util/dom/mutate/mutate');
var domAttr = require("can-util/dom/attr/attr");
var fragment = require('can-util/dom/fragment/fragment');
var makeArray = require('can-util/js/make-array/make-array');

QUnit.module('can-view-live',{
	setup: function(){
		this.fixture = document.getElementById('qunit-fixture');
	}
});


var esc = function (str) {
	return str.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
};

test('text', function () {
	var div = document.createElement('div'),
		span = document.createElement('span');
	div.appendChild(span);
	var items = new List([
		'one',
		'two'
	]);
	var text = compute(function () {
		var html = '';
		items.each(function (item) {
			html += '<label>' + item + '</label>';
		});
		return html;
	});
	live.text(span, text, div);
	equal(div.innerHTML, esc('<label>one</label><label>two</label>'));
	items.push('three');
	equal(div.innerHTML, esc('<label>one</label><label>two</label><label>three</label>'));
});

test('attributes', function () {
	var div = document.createElement('div');
	var items = new List([
		'class',
		'foo'
	]);
	var text = compute(function () {
		var html = '';
		if (items.attr(0) && items.attr(1)) {
			html += items.attr(0) + '=\'' + items.attr(1) + '\'';
		}
		return html;
	});
	live.attrs(div, text);
	equal(div.className, 'foo');
	items.splice(0, 2);
	equal(div.className, '');
	items.push('foo', 'bar');
	equal(div.getAttribute('foo'), 'bar');
});

test('attributes - should remove `removed` events listener', function () {
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
	var text = compute('hello');

	domMutate.appendChild.call(this.fixture, div);
	live.attrs(div, text);
	domMutate.removeChild.call(this.fixture, div);
});

test('attribute', function () {
	var div = document.createElement('div');

	var firstObject = new Map({});
	var first = compute(function () {
		return firstObject.attr('selected') ? 'selected' : '';
	});
	var secondObject = new Map({});
	var second = compute(function () {
		return secondObject.attr('active') ? 'active' : '';
	});
	var className = compute(function(){
		return "foo "+first() + " "+ second()+" end";
	});

	live.attr(div, 'class', className);

	equal(div.className, 'foo   end');
	firstObject.attr('selected', true);
	equal(div.className, 'foo selected  end');
	secondObject.attr('active', true);
	equal(div.className, 'foo selected active end');
	firstObject.attr('selected', false);
	equal(div.className, 'foo  active end');
});

test('specialAttribute with new line', function () {
	var div = document.createElement('div');
	var style = compute('width: 50px;\nheight:50px;');
	live.attr(div, 'style', style);
	equal(div.style.height, '50px');
	equal(div.style.width, '50px');
});







test('text binding is memory safe (#666)', function () {
	nodeLists.nodeMap.clear();

	var div = document.createElement('div'),
		span = document.createElement('span'),
		text = compute(function () {
			return 'foo';
		});
	div.appendChild(span);

	domMutate.appendChild.call(this.fixture, div);

	live.text(span, text, div);
	domMutate.removeChild.call(this.fixture, div);
	stop();
	setTimeout(function () {
		ok(!nodeLists.nodeMap.size, 'nothing in nodeMap');
		start();
	}, 100);
});






test("can.live.attr works with non-string attributes (#1790)", function() {
	var el = document.createElement('div'),
		attrCompute = compute(function() {
			return 2;
		});

	domAttr.set(el, "value", 1);
	live.attr(el, 'value', attrCompute);
	ok(true, 'No exception thrown.');
});





QUnit.test('Works with Observations - .attrs', function () {
	var div = document.createElement('div');
	var items = new List([
		'class',
		'foo'
	]);
	var text = new Observation(function () {
		var html = '';
		if (items.attr(0) && items.attr(1)) {
			html += items.attr(0) + '=\'' + items.attr(1) + '\'';
		}
		return html;
	});
	live.attrs(div, text);
	equal(div.className, 'foo');
	items.splice(0, 2);
	equal(div.className, '');
	items.push('foo', 'bar');
	equal(div.getAttribute('foo'), 'bar');
});

QUnit.test('Works with Observations - .attr', function(){
	var div = document.createElement('div');

	var firstObject = new Map({});

	var first = compute(function () {
		return firstObject.attr('selected') ? 'selected' : '';
	});

	var secondObject = new Map({});
	var second = compute(function () {
		return secondObject.attr('active') ? 'active' : '';
	});
	var className = new Observation(function(){
		return "foo "+first() + " "+ second()+" end";
	});

	live.attr(div, 'class', className);

	equal(div.className, 'foo   end');
	firstObject.attr('selected', true);
	equal(div.className, 'foo selected  end');
	secondObject.attr('active', true);
	equal(div.className, 'foo selected active end');
	firstObject.attr('selected', false);
	equal(div.className, 'foo  active end');
});
