var live = require('can-view-live');
var DefineList = require("can-define/list/list");
var Observation = require("can-observation");
var QUnit = require('steal-qunit');
var SimpleObservable = require("can-simple-observable");

QUnit.module("can-view-live.list");


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
