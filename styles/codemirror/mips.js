CodeMirror.defineMode("mips", function(config, parserConfig) {
  var keywords = ["add", "addi", "addiu", "addu", "and", "andi",
                   "beq", "bgez", "bgezal", "bgtz", "blez", "bltz",
                   "bltzal", "bne", "div", "divu", "j", "jal", "jr",
                   "lb", "lui", "lw", "mfhi", "mflo", "mult", "multu",
                   "noop", "putc", "or", "ori", "sb", "sll", "sllv", "slt",
                   "slti", "sltiu", "sltu", "sra", "srl", "srlv", "sub",
                   "subu", "sw", "syscall", "xor", "xori", ".word", ".string", "ret", "call", "push", "pop"];
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
      if(ch == ',' || ch == '(' || ch == ')') {
        stream.next();
        return null;
      }
      if(ch == ';') {
        state.newline = false;
        stream.skipToEnd();
        return "comment";
      }
      if(stream.eat(/[\-0-9]/)) {
        state.newline = false;
        stream.next();
        stream.eatWhile(/[x0-9A-Fa-f]/);
        return "number";
      }
      if(state.newline && stream.match(/[_0-9A-Za-z]+:/)) {
        state.newline = false;
        return "string";
      }
      if(stream.match(/[_a-zA-Z\.]+/) && !state.opcode) {
        state.newline = false;
        state.opcode = true;
        if(keywords.indexOf(stream.current()) != -1) {
          return "keyword";
        } else return null;
      }
      stream.next();
      
    },
  }
});

CodeMirror.defineMIME("text/x-mips", "mips");
