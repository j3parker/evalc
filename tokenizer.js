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
        table["(start)"].push([t, t]);
      } else if(t.length == 2) {
        if(!schars[t[0]]) {
          table["(start)"].push([t[0], t[0]]);
	  schars[t[0]] = true;
	} 
	if(!table[t[0]]) { table[t[0]] = [] }
	table[t[0]].push([t[1], t])
      } else {
        console.log("Bad: ", t);
      }
      finals[t] = true;
    }
  }

  table["(start)"] = [
    ["'", "charseq"],
    ['"', "stringseq"],
    ["00", "zero"],
    ["_z", "name"],
    ["AZ", "name"],
    ["19", "int"],
    ["\t ", "whitespace"],
    ["/", "/"],
  ];


  /* Includes crap control characters that shouldn't be here anyways */
  table["whitespace"] = [["\t ", "whitespace"]];

  table["/"] = [['*', '/*'], ['/', '//']];
  table['//'] = [[' .', '//'], ['0~', '//'], ['\n', 'whitespace']]

  table['/*'] = [['\t)', '/*'], ['+~', '/*'], ['*', '/**']];
  table['/**'] = [['/', 'whitespace'], ['\t.', '/*'], ['0~', '/*']];

  table["stringseq"] = [['"', "string"],[" !", "stringseq"],["#[", "stringseq"],
                         ["]~", "stringseq"],  ['\\', 'stringslash']]
  table["stringslash"] = [[' ~', 'stringseq']]

  /*C11 A.1.7*/
  punctuators(table, 
    ["[", "]", "(", ")", "{", "}", ".", "->", 
     "++", "--", "&", "*", "+", "-", "~", "!",
     "/", "%", "<<", ">>", "<", ">", "<=", ">=", "==", "!=",
     "^", "|", "&&", "||", "?", ":", ";",
     "=", "*=", "/=", "%=", "+=", "-=", "&=", "^=", "|=",
     ",", "#", "##"]); /*Ommitted: Digraphs, ..., <<=, >>=*/

  table["int"] = [ ["09", "int"], /*int suffixes: U, L*/ ];
  table["octal"] = [["07", "octal"]];

  table["zero"] = 
   [['07', "octal"],
    ['x', "hexprefix"],
    ['X', "hexprefix"]];

  table["hexprefix"] = [
    ['09', 'hexint'],
    ['af', 'hexint'],
    ['AF', 'hexint']];
  table['hexint'] = table['hexprefix']

  table["name"] = [
    ['_z', 'name'],
    ['AZ', 'name'],
    ['09', 'name'],
  ];

  var change = function(c) {
    var trans = table[state];
    if(!trans) return;
    //console.log("transition '" + c + "' in " + state);
    //console.log(trans)
    for(var i = 0; i < trans.length; i++) {
      var r = trans[i];
      if(r[0].length == 1) {
        if(c == r[0]) {
	  return r[1];
	}
      } else if(c >= r[0][0] && c <= r[0][1]) {
        //console.log("Rule " + r);
        return r[1];
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
	  this.error("Unexpected tokenizing fail: '" + c + "' in state '" + state + "'");
	  return false;
	}
	//console.log("State '" + state + "' -> '" + newstate + "'");
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
