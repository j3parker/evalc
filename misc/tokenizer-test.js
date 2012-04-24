var tokenizer = require('./tokenizer.js');

Object.prototype.error = function(s) {
  console.log(s);
}

var tokens = tokenizer.tokenize_string("abc \n 3 <= 4 def/*wtf*/ foo(); baz");

for(var i = 0; i < 10; i++) {
var f = tokens.get();
console.log(f);
if(!f) break;
}

