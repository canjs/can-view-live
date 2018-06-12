var live = require('can-view-live');
var DefineList = require("can-define/list/list");
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var SimpleObservable = require("can-simple-observable");
var SimpleMap = require("can-simple-map");
var canReflect = require("can-reflect");
var queues = require("can-queues");
var fragment = require('can-fragment');
var NodeLists = require("can-view-nodelist");
var domMutate = require('can-dom-mutate');
var domMutateNode = require('can-dom-mutate/node');
var canSymbol = require("can-symbol");
var testHelpers = require('can-test-helpers');
var canReflectDeps = require('can-reflect-dependencies');

QUnit.module("can-view-live.list",{
	setup: function(){
		this.fixture = document.getElementById("qunit-fixture");
	}
});


QUnit.test('basics', function () {
	var div = document.createElement('div'),
		list = new DefineList([
			'sloth',
			'bear'
		]),
		template = function (animal) {
			return '<label>Animal=</label> <span>' + animal.get() + '</span>';
		};
	div.innerHTML = 'my <b>fav</b> animals: <span></span> !';
	var el = div.getElementsByTagName('span')[0];

	live.list(el, list, template, {});

	equal(div.getElementsByTagName('label')
		.length, 2, 'There are 2 labels');

    div.getElementsByTagName('label')[0].myexpando = 'EXPANDO-ED';

	list.push('turtle');
	equal(div.getElementsByTagName('label')[0].myexpando, 'EXPANDO-ED', 'same expando');
	equal(div.getElementsByTagName('span')[2].innerHTML, 'turtle', 'turtle added');

});


QUnit.test('list within an Observation', 5, function () {
	var div = document.createElement('div'),
		map = new SimpleMap({
			animals: new DefineList([
				'bear',
				'turtle'
			])
		}),
		template = function (animal) {
			return '<label>Animal=</label> <span>' + animal.get() + '</span>';
		};
	var listCompute = new Observation(function animalsFromMap() {
		return map.attr('animals');
	});
	div.innerHTML = 'my <b>fav</b> animals: <span></span> !';
	var el = div.getElementsByTagName('span')[0];
	live.list(el, listCompute, template, {});
	equal(div.getElementsByTagName('label')
		.length, 2, 'There are 2 labels');
	div.getElementsByTagName('label')[0].myexpando = 'EXPANDO-ED';

	map.attr('animals')
		.push('turtle');

	equal(div.getElementsByTagName('label')[0].myexpando, 'EXPANDO-ED', 'same expando');
	equal(div.getElementsByTagName('span')[2].innerHTML, 'turtle', 'turtle added');

	map.attr('animals', new DefineList([
		'sloth',
		'bear',
		'turtle'
	]));
	var spans = div.getElementsByTagName('span');
	equal(spans.length, 3, 'there are 3 spans');
	ok(!div.getElementsByTagName('label')[0].myexpando, 'no expando');
});

QUnit.test('.list within a observable value holding an Array list', function () {
	var div = document.createElement('div');
	var template = function (num) {
		return '<label>num=</label> <span>' + num + '</span>';
	};
	var arr = new SimpleObservable([ 0, 1 ]);
	div.innerHTML = 'my <b>fav</b> nums: <span></span> !';
	var el = div.getElementsByTagName('span')[0];

	live.list(el, arr, template, {});

	equal(div.getElementsByTagName('label').length, 2, 'There are 2 labels');
	arr.set([ 0, 1, 2 ]);
	var spans = div.getElementsByTagName('span');
	equal(spans.length, 3, 'there are 3 spans');
});


test('live.list should handle move patches', function (assert) {
	/*
		All this test does is make sure triggering the move event
		does not cause live.list to blow up.
	*/
	var parent = document.createElement('div');
	var child = document.createElement('div');
	parent.appendChild(child);

    var onPatchesHandler;
    var list = ["a","b","c"];
    canReflect.assignSymbols(list,{
        "can.onPatches": function(handler){
            onPatchesHandler = handler;
        }
    });

    var template = function (num) {
		return '<span>' + num.get() + '</span>';
	};

	live.list(child, list, template, {});

    list.shift();
    list.splice(1,0,"a");
	queues.batch.start();
	onPatchesHandler([
        {type: "move",   fromIndex: 0, toIndex: 1}
    ]);
	queues.batch.stop();

	assert.ok(true, 'The list should not blow up');
    var values = canReflect.toArray( parent.getElementsByTagName("span") ).map(function(span){
        return span.innerHTML;
    });
    QUnit.deepEqual(values, ["b","a","c"]);
});

QUnit.test('list and an falsey section (#1979)', function () {
	var div = document.createElement('div'),
		template = function (num) {
			return '<label>num=</label> <span>' + num + '</span>';
		},
		falseyTemplate = function () {
			return '<p>NOTHING</p>';
		};

	var listCompute = new SimpleObservable([ 0, 1 ]);
	div.innerHTML = 'my <b>fav</b> nums: <span></span> !';
	var el = div.getElementsByTagName('span')[0];
	live.list(el, listCompute, template, {}, undefined, undefined, falseyTemplate );

	equal(div.getElementsByTagName('label').length, 2, 'There are 2 labels');

	listCompute.set([]);

	var spans = div.getElementsByTagName('span');
	equal(spans.length, 0, 'there are 0 spans');

	var ps = div.getElementsByTagName('p');
	equal(ps.length, 1, 'there is 1 p');

	listCompute.set([2]);

	spans = div.getElementsByTagName('span');
	equal(spans.length, 1, 'there is 1 spans');

	ps = div.getElementsByTagName('p');
	equal(ps.length, 0, 'there is 1 p');
});

QUnit.test('list and an initial falsey section (#1979)', function(){

	var div = document.createElement('div'),
		template = function (num) {
			return '<label>num=</label> <span>' + num + '</span>';
		},
		falseyTemplate = function () {
			return '<p>NOTHING</p>';
		};

	var listCompute = new SimpleObservable([]);

	div.innerHTML = 'my <b>fav</b> nums: <span></span> !';
	var el = div.getElementsByTagName('span')[0];
	live.list(el, listCompute, template, {}, undefined, undefined, falseyTemplate );

	var spans = div.getElementsByTagName('span');
	equal(spans.length, 0, 'there are 0 spans');

	var ps = div.getElementsByTagName('p');
	equal(ps.length, 1, 'there is 1 p');

	listCompute.set([2]);

	spans = div.getElementsByTagName('span');
	equal(spans.length, 1, 'there is 1 spans');

	ps = div.getElementsByTagName('p');
	equal(ps.length, 0, 'there is 1 p');
});


test('list items should be correct even if renderer flushes batch (#8)', function () {
	var partial = document.createElement('div');
	var placeholderElement = document.createElement('span');
	var list = new DefineList([ 'one', 'two' ]);
	var renderer = function(item) {
		// batches can be flushed in renderers (such as those using helpers like `#each`)
        // though this should VERY rarely happen
        // this should NEVER happen anymore because notify is always fired immediately ... there's no "flush"
        // that gets passed the update queue
		queues.flush();
		return '<span>' + item.get() + '</span>';
	};

	partial.appendChild(placeholderElement);

	live.list(placeholderElement, list, renderer, {});

	equal(partial.getElementsByTagName('span').length, 2, 'should be two items');
	equal(partial.getElementsByTagName('span')[0].firstChild.data, 'one', 'list item 0 is "one"');
	equal(partial.getElementsByTagName('span')[1].firstChild.data, 'two', 'list item 1 is "two"');

	queues.batch.start();
	list.splice(0, 0, 'three'); // add 3 at the start
	list.splice(2, 1); // remove the last

    queues.batch.stop();

	equal(partial.getElementsByTagName('span').length, 2, 'should be two items');
	equal(partial.getElementsByTagName('span')[0].firstChild.data, 'three', 'list item 0 is "three"');
	equal(partial.getElementsByTagName('span')[1].firstChild.data, 'one', 'list item 1 is "one"');
});




test('changing items in a live.list after it has been unregistered works (#55)', function() {
	// this test replicates the behavior of this stache template:
	//
	// {{#if show}}
	//		{{#each list}}
	//			{{.}}
	//		{{/each}}
	//	{{/if}}
	//
	//	and this code:
	//
	//	canBatch.start();
	//	show = false;
	//	list.replace(...);
	//	canBatch.stop();
	var map = new SimpleMap({
		show: true,
		list: new DefineList([ 'one' ])
	});

	// set up nodelists
	var htmlNodeList = canReflect.toArray(fragment("<div></div>").childNodes);
	NodeLists.register(htmlNodeList, function(){}, true);

	var listNodeList = canReflect.toArray(fragment("<div></div>").childNodes);
	NodeLists.register(listNodeList, function(){}, htmlNodeList, true);

	// set up elements
	var listTextNode = document.createTextNode('');
	var listFrag = document.createDocumentFragment();
	listFrag.appendChild(listTextNode);

	var htmlTextNode = document.createTextNode('');
	var div = document.createElement('div');
	div.appendChild(htmlTextNode);

	// create live.list for `{{#each list}}`
	var listObs = new Observation(function list() {
		return map.attr('list');
	},{priority: 2});
	var listRenderer = function(item) {
		// must use an Observation as the live.list "compute"
		// Observation.prototype.get() will trigger a canBatch.flush() (if observation is bound)
		// which will cause the listNodeList to be unregistered
		Observation.temporarilyBind(item);
		return item.get();
	};
	live.list(listTextNode, listObs, listRenderer, map, listTextNode.parentNode, listNodeList);

	// create live.html for `{{#if show}}`
	var htmlObservation = new Observation(function if_show_html() {
		return map.attr('show') ? listFrag : undefined;
	},{priority: 1});

	live.html(htmlTextNode, htmlObservation, htmlTextNode.parentNode, htmlNodeList);

	queues.batch.start();
	map.attr('show', false);
	map.attr('list').replace([ 'two', 'three' ]);
	queues.batch.stop();

	QUnit.ok(true, 'should not throw');
});


QUnit.test('Works with Observations - .list', function () {
	var div = document.createElement('div'),
		map = new SimpleMap({
			animals: new DefineList([
				'bear',
				'turtle'
			])
		}),
		template = function (animal) {
			return '<label>Animal=</label> <span>' + animal.get() + '</span>';
		};
	var listObservation = new Observation(function () {
		return map.attr('animals');
	});
	div.innerHTML = 'my <b>fav</b> animals: <span></span> !';
	var el = div.getElementsByTagName('span')[0];
	live.list(el, listObservation, template, {});
	equal(div.getElementsByTagName('label')
		.length, 2, 'There are 2 labels');
	div.getElementsByTagName('label')[0].myexpando = 'EXPANDO-ED';

	map.attr('animals')
		.push('turtle');

	equal(div.getElementsByTagName('label')[0].myexpando, 'EXPANDO-ED', 'same expando');
	equal(div.getElementsByTagName('span')[2].innerHTML, 'turtle', 'turtle added');

	map.attr('animals', new DefineList([
		'sloth',
		'bear',
		'turtle'
	]));
	var spans = div.getElementsByTagName('span');
	equal(spans.length, 3, 'there are 3 spans');
	ok(!div.getElementsByTagName('label')[0].myexpando, 'no expando');
});

test("no memory leaks", function () {
	var div = document.createElement('div'),
		map = new SimpleMap({
			animals: new DefineList([
				'bear',
				'turtle'
			])
		}),
		template = function (animal) {
			return '<label>Animal=</label> <span>' + animal.get() + '</span>';
		};
	var listObservation = new Observation(function () {
		return map.attr('animals');
	});
	div.innerHTML = 'my <b>fav</b> animals: <span></span> !';
	var el = div.getElementsByTagName('span')[0];
	this.fixture.appendChild(div);
	var fixture = this.fixture;

	live.list(el, listObservation, template, {});


	QUnit.stop();
	setTimeout(function(){
		domMutateNode.removeChild.call(fixture,div);
		setTimeout(function () {
			var handlers = map[canSymbol.for("can.meta")].handlers.get([]);
			equal(handlers.length, 0, "there are no bindings");
			start();
		}, 50);
	},10);
});

testHelpers.dev.devOnlyTest('can-reflect-dependencies', function(assert) {
	var done = assert.async();
	assert.expect(2);

	var div = document.createElement('div');
	div.innerHTML = 'my <b>fav</b> animals: <span></span> !';
	document.body.appendChild(div);

	var el = div.getElementsByTagName('span')[0];
	var list = new DefineList(['sloth', 'bear']);
	var template = function(animal) {
		return '<label>Animal=</label> <span>' + animal.get() + '</span>';
	};

	live.list(el, list, template, {});

	assert.deepEqual(
		canReflectDeps
			.getDependencyDataOf(div)
			.whatChangesMe
			.mutate
			.valueDependencies,
		new Set([list])
	);

	var undo = domMutate.onNodeRemoval(div, function checkTeardown () {
		undo();

		assert.equal(
			typeof canReflectDeps.getDependencyDataOf(div),
			'undefined',
			'dependencies should be cleared when parent node is removed'
		);

		done();
	});

	div.remove();
});

test("no memory leaks with replacements (#93)", function () {

	var div = document.createElement('div'),
		animals = new DefineList([
			'bear',
			'turtle'
		]),
		template = function (animal) {
			return '<label>Animal=</label> <span>' + animal.get() + '</span>';
		};
	div.innerHTML = 'my <b>fav</b> animals: <span></span> !';
	var htmlNodeList = canReflect.toArray(div.childNodes);
	NodeLists.register(htmlNodeList, function(){}, true);

	var el = div.getElementsByTagName('span')[0];

	this.fixture.appendChild(div);
	var nodeList = [el];
	NodeLists.register(nodeList, function(){}, htmlNodeList);
	live.list(el, animals, template, {}, this.fixture, nodeList);

	QUnit.deepEqual(nodeList.replacements, [], "no replacements");

	animals.push("foo");

	QUnit.deepEqual(nodeList.replacements, [], "no replacements");

	animals.shift();

	QUnit.deepEqual(nodeList.replacements, [], "no replacements");
});
