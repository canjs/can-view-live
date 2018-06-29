var live = require('can-view-live');
var DefineList = require("can-define/list/list");
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var SimpleObservable = require("can-simple-observable");
var NodeLists = require("can-view-nodelist");
var testHelpers = require('can-test-helpers');
var domMutate = require('can-dom-mutate');
var canReflectDeps = require('can-reflect-dependencies');
var canSymbol = require('can-symbol');
var fragment = require("can-fragment");
var queues = require("can-queues");

QUnit.module("can-view-live.html");


test('basics', function () {
	var div = document.createElement('div'),
		span = document.createElement('span');
	div.appendChild(span);
	var items = new DefineList([
		'one',
		'two'
	]);
	var html = new Observation(function itemsHTML() {
		var html = '';
		items.forEach(function (item) {
			html += '<label>' + item + '</label>';
		});
		return html;
	});
	live.html(span, html, div);
	equal(div.getElementsByTagName('label').length, 2);
	items.push('three');
	equal(div.getElementsByTagName('label').length, 3);
});

test('html live binding handles getting a function from a compute',5, function(){
	var handler = function(el){
		ok(true, "called handler");
		equal(el.nodeType, 3, "got a placeholder");
	};

	var div = document.createElement('div'),
		placeholder = document.createTextNode('');
	div.appendChild(placeholder);

	var count = new SimpleObservable(0);
	var html = new Observation(function(){
		if(count.get() === 0) {
			return "<h1>Hello World</h1>";
		} else {
			return handler;
		}
	});

	live.html(placeholder, html, div);

	equal(div.getElementsByTagName("h1").length, 1, "got h1");
	count.set(1);
	equal(div.getElementsByTagName("h1").length, 0, "got h1");
	count.set(0);
	equal(div.getElementsByTagName("h1").length, 1, "got h1");
});


QUnit.test("Works with Observations - .html", function(){
	var div = document.createElement('div'),
		span = document.createElement('span');
	div.appendChild(span);
	var items = new DefineList([
		'one',
		'two'
	]);
	var html = new Observation(function () {
		var html = '';
		items.forEach(function (item) {
			html += '<label>' + item + '</label>';
		});
		return html;
	});
	live.html(span, html, div);
	equal(div.getElementsByTagName('label').length, 2);
	items.push('three');
	equal(div.getElementsByTagName('label').length, 3);
});

test("html live binding handles objects with can.viewInsert symbol", 2, function(assert) {
	var div = document.createElement("div");
	var options = {};
	var placeholder = document.createTextNode("Placeholder text");
	div.appendChild(placeholder);

	var html = new Observation(function() {
		return {
			[canSymbol.for("can.viewInsert")]: function() {
				assert.equal(arguments[0], options, "options were passed to symbol function");
				return document.createTextNode("Replaced text");
			}
		};
	});

	live.html(placeholder, html, div, options);

	assert.equal(div.textContent, "Replaced text", "symbol function called");
});

testHelpers.dev.devOnlyTest("child elements must disconnect before parents can re-evaluate", 1,function(){
	var observable = new SimpleObservable("value");

	var childObservation = new Observation(function child(){
		QUnit.ok(true, "called child content once");
		observable.get();
		return "CHILD CONTENT";
	},null, {priority: 1});

	var htmlNodeList= [];

	var parentObservation = new Observation(function parent(){
		var result = observable.get();
		if(result === "value") {
			var childTextNode = document.createTextNode('');
			var childFrag = document.createDocumentFragment();
			childFrag.appendChild(childTextNode);
			var nodeList = [childTextNode];

			NodeLists.register(nodeList, null, htmlNodeList, true);
			live.html(childTextNode, childObservation, null, nodeList);
			return childFrag;
		} else {
			return "NEW CONTENT";
		}
	},null,{priority: 0});

	var parentTextNode = document.createTextNode('');
	var div = document.createElement('div');
	div.appendChild(parentTextNode);
	htmlNodeList.push(parentTextNode);

	NodeLists.register(htmlNodeList, function(){}, true, true);
	live.html(parentTextNode, parentObservation, div, htmlNodeList);

	observable.set("VALUE");
});

testHelpers.dev.devOnlyTest('can-reflect-dependencies', function(assert) {
	var done = assert.async();
	assert.expect(3);

	var div = document.createElement('div'),
		span = document.createElement('span');

	div.appendChild(span);
	document.body.appendChild(div);

	var html = new Observation(function() {
		return '<p>Hello</p>';
	});
	live.html(span, html, div);

	assert.deepEqual(
		canReflectDeps
			.getDependencyDataOf(div)
			.whatChangesMe
			.mutate
			.valueDependencies,
		new Set([html]),
		'whatChangesMe(<div>) shows the observation'
	);

	assert.deepEqual(
		canReflectDeps
			.getDependencyDataOf(html)
			.whatIChange
			.derive
			.valueDependencies,
		new Set([div]),
		'whatChangesMe(<observation>) shows the div'
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

QUnit.test(".html works inside a .list (can-stache#542)", function(){
	var div = document.createElement('div'),
		span = document.createElement('span');
	div.appendChild(span);

	var itemNodeList = NodeLists.register([span]);
	var listNodeList = NodeLists.register([itemNodeList]);


	var content = new SimpleObservable( fragment("<p>Hello</p>") );

	live.html(span, content, div, itemNodeList);

	// force a change, but something else will have already responded
	queues.batch.start();
	content.set( fragment("<span>Goodbye</span>") );
	// NodeList has been updated immediately, but the DOM isn't up to date
	queues.domUIQueue.enqueue(function(){
		var itemNodeList = listNodeList[0];
		QUnit.equal( div.firstChild, itemNodeList[0], "the DOM and nodeList should be in sync");
	});

	queues.batch.stop();
});
