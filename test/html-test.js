var live = require('can-view-live');
var DefineList = require("can-define/list/list");
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var SimpleObservable = require("can-simple-observable");
var testHelpers = require('can-test-helpers');
var domMutate = require('can-dom-mutate');
var canReflectDeps = require('can-reflect-dependencies');
var canSymbol = require('can-symbol');
var fragment = require("can-fragment");
var queues = require("can-queues");
var domMutateNode = require("can-dom-mutate/node/node");

QUnit.module("can-view-live.html");

QUnit.test('basics', function () {
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
	live.html(span, html);
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

	live.html(placeholder, html);

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
		var d = {};
		d[canSymbol.for("can.viewInsert")] = function() {
			assert.equal(arguments[0], options, "options were passed to symbol function");
			return document.createTextNode("Replaced text");
		};
		return d;
	});

	live.html(placeholder, html, options);

	assert.equal(div.textContent, "Replaced text", "symbol function called");
});

testHelpers.dev.devOnlyTest("child elements must disconnect before parents can re-evaluate", 1,function(){
	var observable = new SimpleObservable("value");

	// this observation should run once ...
	var childObservation = new Observation(function child(){
		QUnit.ok(true, "called child content once");
		observable.get();
		return "CHILD CONTENT";
	});

	// PARENT OBSERVATION ... should be notified and teardown CHILD OBSERVATION
	var parentObservation = new Observation(function parent(){
		var result = observable.get();
		if(result === "value") {
			var childTextNode = document.createTextNode('');
			var childFrag = document.createDocumentFragment();
			childFrag.appendChild(childTextNode);

			// CHILD OBSERVATION
			live.html(childTextNode, childObservation);

			return childFrag;
		} else {
			return "NEW CONTENT";
		}
	});

	var parentTextNode = document.createTextNode('');
	var div = document.createElement('div');
	//document.body.appendChild(div);
	div.appendChild(parentTextNode);

	//window.queues = queues;

	live.html(parentTextNode, parentObservation);
	//queues.log("flush");
	observable.set("VALUE");
});

testHelpers.dev.devOnlyTest('can-reflect-dependencies', function(assert) {

	var done = assert.async();
	assert.expect(3);

	var div = document.createElement('div'),
		span = document.createElement('span');

	div.appendChild(span);
	document.body.appendChild(div);

	var html = new Observation(function simpleHello() {
		return '<p>Hello</p>';
	});
	live.html(span, html);


	assert.deepEqual(
		canReflectDeps
			.getDependencyDataOf(div.firstChild)
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
		new Set([div.firstChild]),
		'whatChangesMe(<observation>) shows the div'
	);

	var undo = domMutate.onNodeDisconnected(div, function checkTeardown () {
		undo();
		setTimeout(function(){


			assert.equal(
				typeof canReflectDeps.getDependencyDataOf(div.firstChild),
				'undefined',
				'dependencies should be clear out when elements is removed'
			);

			done();
		},20);
	});
	// TODO: check this again once domMutate is able to work with normal add / remove
	domMutateNode.removeChild.call( div.parentNode, div);
});

QUnit.test(".html works if it is enqueued twice", function(){
	// enqueue in domUI right away and change again in there
	var div = fragment("<div>PLACEHOLDER</div>").firstChild;
	var html = new SimpleObservable(fragment("<p>1</p>"));

	live.html(div.firstChild, html);
	queues.batch.start();

	queues.domUIQueue.enqueue(function setHTMLTO3(){
		var frag3 = fragment("<p>3</p>");
		frag3.ID = 3;
		html.set(frag3);
	},null,[]);
	var frag2 = fragment("<p>2</p>");
	frag2.ID = 2;

	html.set(frag2);
	queues.batch.stop();

	QUnit.ok(true, "got here without an error");

	QUnit.deepEqual(div.querySelector("p").textContent, "3");


});
