/* Javascript C tokenizer*/

/* It's a DFA. This took too much effort and was dumb. */

;(function(exports, undefined) {
"use strict";


var tokenize = function(){
  var state =  "(start)"
  var finals = {
    name: true,
    zero: true,
    int: true,
    hexint: true,
    octal: true,
    whitespace: true,
    string: true,
    "(end)": true,
  }
  var table = {}
  var curr = "";

  var make = function() {
    var ret = {
      type: state,
      value: curr,
    };
    state = "(start)"; curr = "";
    return ret;
  }

  var punctuators = function(table, ts) {
    var schars = {'/':true};
    for(var i = 0; i < ts.length; i++) {
      var t = ts[i];
      if(t.length == 1) {
        table["(start)"].push([t, t, t]);
      } else if(t.length == 2) {
        if(!schars[t[0]]) {
          table["(start)"].push([t[0], t[0], t[0]]);
	  schars[t[0]] = true;
	} 
	if(!table[t[0]]) { table[t[0]] = [] }
	table[t[0]].push([t[1], t[1], t])
      } else {
        console.log("Bad: ", t);
      }
      finals[t] = true;
    }
  }

  table["(start)"] = [
    ["'", "'", "charseq"],
    ['"', '"', "stringseq"],
    ["0", "0", "zero"],
    ["_", "z", "name"],
    ["A", "Z", "name"],
    ["1", "9", "int"],
    ["\n", " ", "whitespace"],
    ["/", "/", "/"],
  ];


  /* Includes crap control characters that shouldn't be here anyways */
  table["whitespace"] = [["\n", " ", "whitespace"]];

  table["/"] = [['*', '*', '/*'], ['/', '/', '//']];

  table['/*'] = [[' ', ')', '/*'], ['+', '~', '/*'], ['*', '*', '/**']];
  table['/**'] = [['/', '/', 'whitespace'], [' ', '.', '/*'], ['0', '~', '/*']];

  table["stringseq"] = [
   [" ", "!", "stringseq"], ["#", "[", "stringseq"], ["]", "~", "stringseq"],
   ['"', '"', "string"]]

  /*C11 A.1.7*/
  punctuators(table, 
    ["[", "]", "(", ")", "{", "}", ".", "->", 
     "++", "--", "&", "*", "+", "-", "~", "!",
     "/", "%", "<<", ">>", "<", ">", "<=", ">=", "==", "!=",
     "^", "|", "&&", "||", "?", ":", ";",
     "=", "*=", "/=", "%=", "+=", "-=", "&=", "^=", "|=",
     ",", "#", "##"]); /*Ommitted: Digraphs, ..., <<=, >>=*/

  table["int"] = [
    ["0", "9", "int"],
    // int suffixes: U, L
  ];
  table["octal"] = ["0", "7", "octal"];

  table["zero"] = 
   [['0', '7', "octal"],
    ['x', 'x', "hexprefix"],
    ['X', 'X', "hexprefix"]];

  table["hexprefix"] = [
    ['0', '9', 'hexint'],
    ['a', 'f', 'hexint'],
    ['A', 'F', 'hexint']];
  table['hexint'] = table['hexprefix']

  table["name"] = [
    ['_', 'z', 'name'],
    ['A', 'Z', 'name'],
    ['0', '9', 'name'],
  ];

  var change = function(c) {
    var trans = table[state];
    if(!trans) return;
    //console.log("transition '" + c + "' in " + state);
    //console.log(trans)
    for(var i = 0; i < trans.length; i++) {
      var r = trans[i];
      if(c >= r[0] && c <= r[1]) {
        //console.log("Rule " + r);
        return r[2];
      }
    }
  }

  return {
    get: function() {
      while(true) {
        var c = this.peekchar();
	if(typeof c == "undefined") { 
	  var r = make();
	  state = "(end)";
	  return r;
	};
        var newstate = change(c);
	if(!newstate) {
	  if(finals[state]) {
	    return make();
	  }
	  this.error("Unexpected tokenizing fail: " + c + " in state " + state);
	  return false;
	}
        state = newstate;
	curr += c;
        this.nextchar();
      }
    },
  }
};

var tokenize_string= function(s) {
  /* Tokenize from a string */
  var toker = tokenize();
  var i = 0;
  toker.nextchar = function() {
    return s[i++];
  }
  toker.peekchar = function() {
    return s[i];
  }

  return toker;
}

exports.tokenize_string = tokenize_string;
})(exports);
