var C = function(x) {return document.createElement(x)}
var A = function(a, b) {return a.appendChild(b)}
;(function(exports, undefined) {
"use strict";
var document = window.document

var draw = function(tree) {
  var d = C('div');
  if(typeof tree.length == "number") { //array
    for(var i = 0; i < tree.length; i++) {
      d.setAttribute('class', 'array');
      A(d, draw(tree[i]));
    }
    // unary binary ternary 
  } else {
    switch(tree.arity) {
      case "ternary":
	A(d, draw(tree.third))
      case "binary":
	A(d, draw(tree.second))
      case "unary":
	A(d, draw(tree.first))
	var f = C('div');
	f.innerHTML = tree.value + "<br>"
	A(f, d);
	d = f;
      break;
      default:
      d.innerHTML = JSON.stringify(tree, 
       ["value", "name", "first", "second", "third", "fourth", "arity"], '  ');
    }
  }
  return d;
}

exports.draw = draw;
})(exports);
