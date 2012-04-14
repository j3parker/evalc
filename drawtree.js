;(function(window, undefined) {
"use strict";
var document = window.document
var C = function(x) {return document.createElement(x)}
var A = function(a, b) {return a.appendChild(b)}

var draw = function(tree) {
  var d = C('div');
  if(typeof tree.length == "number") {
    for(var i = 0; i < tree.length; i++) {
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
    break;
    default:
    d.innerHTML = JSON.stringify(tree, 
     ["value", "name", "first", "second", "third", "fourth", "arity"], '  ');
    }
  }
  return d;
}

exports.draw = draw;
})(window);
