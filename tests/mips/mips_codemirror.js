CodeMirror.defineMode("mips", function(config, parserConfig) {
  var keywords = ["add", "addi", "addiu", "addu", "and", "andi",
                   "beq", "bgez", "bgezal", "bgtz", "blez", "bltz",
                   "bltzal", "bne", "div", "divu", "j", "jal", "jr",
                   "lb", "lui", "lw", "mfhi", "mflo", "mult", "multu",
                   "noop", "or", "ori", "sb", "sll", "sllv", "slt",
                   "slti", "sltiu", "sltu", "sra", "srl", "srlv", "sub",
                   "subu", "sw", "syscall", "xor", "xori"];
  var labelre = new RegExp(/^[a-zA-Z][a-zA-Z0-9]*:/);
  return {
    startState: function(basecolumn) {
      return {
        opcode: false,
        newline: true,
      };
    },
    token: function (stream, state) {
      if(stream.sol()) { state.newline = true; state.opcode = false; }
      if(stream.eatSpace()) return;
      var ch = stream.peek();
      if(ch == '$') {
        stream.next();
        stream.eatWhile(/[0-9]/);
        state.newline = false;
        return "atom"
      }
      if(state.newline && stream.match(/[a-z][a-z]*:/)) {
        state.newline = false;
        return "string";
      }
      if(ch == ';') {
        state.newline = false;
        stream.skipToEnd();
        return "comment";
      }
      if(stream.eat(/[0-9]/)) {
        state.newline = false;
        stream.next();
        stream.eatWhile(/[0-9]/);
        return "number";
      }
      if(stream.match(/[a-zA-Z]+/) && !state.opcode) {
        state.newline = false;
        state.opcode = true;
        if(keywords.indexOf(stream.current()) != -1) {
          return "keyword";
        } else return null;
      }
      stream.next();
      
    },

    indent: function(state, textAfter) {
      if(match = labelre.exec(textAfter)) {
        return config.indentUnit - match[0].length - 1;
      }
      else return config.indentUnit;
    }
  }
});

CodeMirror.defineMIME("text/x-mips", "mips");
