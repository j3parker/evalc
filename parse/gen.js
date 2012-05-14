
function MakeGenSym(prefix) {
  var i = 0;
  var res = function() { return prefix + i++; };
  res.reset = function() { i = 0; };
  return res;
}

var while_gensym = MakeGenSym("while_");
var endwhile_gensym = MakeGenSym("endwhile_");
var else_gensym = MakeGenSym("else_");
var endif_gensym = MakeGenSym("endif_");
var for_gensym = MakeGenSym("for_");
var endfor_gensym = MakeGenSym("endfor_");

var rZERO = 0,
    rAT   = 1,
    rV0   = 2,
    rV1   = 3,
    rLR   = 31;

function gen(node) {
  var i;
  var asm = new Array();
  while_gensym.reset();
  endwhile_gensym.reset();
  else_gensym.reset();
  endif_gensym.reset();
  for_gensym.reset();
  endfor_gensym.reset();
  for(i = 0; i < node.globals.length; i++) {
    gen_statement(node.globals[i], asm, new Object());
  }
  return asm;
}

function gen_statement(node, asm, acc) {
  var i;
  switch(node.node_type) {
    case 'block':
      if(node.contents == null) break;
      for(i = 0; i < node.contents.length; i++) {
        if(typeof node.contents[i].node_type !== "undefined" && node.contents[i].node_type === "decl") {
          assert(0 == 1); // TODO
        }
        gen_statement(node.contents[i], asm, acc);
      }
      break;
    case 'expression':
      gen_expr(node, rZERO, asm, acc);
      break;
    case 'return':
      if(node.target !== null) {
        gen_expr(node.target, rV0, asm, acc);
      }
      asm.push(mips_jr(rLR));
      break;
    case 'function_definition':
      asm.push(node.name+":\n");
      gen_statement(node.body, asm, acc);
      asm.push("\n");
      break;
    case 'if':
      gen_expr(node.cond, rV0, asm, acc);
      if(node.else !== null) else_lbl = else_gensym();
      endif_lbl = endif_gensym();
      if(node.else !== null) asm.push(mips_bne(0, rV0, else_lbl));
      else                   asm.push(mips_bne(0, rV0, endif_lbl));
      gen_statement(node.then, asm, acc);
      if(node.else !== null) {
        asm.push(else_lbl + ": ");
        gen_statement(node.else, asm, acc);
      } else {
        asm.push(endif_lbl + ": \n");
      }
      break;
    case 'for':
      for_lbl = for_gensym();
      endfor_lbl = endfor_gensym();
      var oldloopstart = acc.loop_start;
      var oldloopexit = acc.loop_exit;
      acc.loop_start = for_lbl;
      acc.loop_exit = endfor_lbl;
      gen_expr(node.init, rV0, asm, acc);
      asm.push(for_lbl + ": ");
      gen_expr(node.cond, rV0, asm, acc);
      asm.push(mips_beq(rV0, 0, endfor_lbl));
      if(node.action !== null) gen_expr(node.action, rV0, asm, acc);
      gen_statement(node.body, asm, acc);
      asm.push(mips_j(for_lbl));
      asm.push(endfor_lbl + ": ");
      acc.loop_start = oldloopstart;
      acc.loop_exit = oldloopexit;
      break;
    case 'while':
      while_lbl = while_gensym();
      endwhile_lbl = endwhile_gensym();
      var oldloopstart = acc.loop_start;
      var oldloopexit = acc.loop_exit;
      acc.loop_start = while_lbl;
      acc.loop_exit = endwhile_lbl;
      asm.push(while_lbl + ": ");
      gen_expr(node.cond, rV0, asm, acc);
      asm.push(mips_beq(rV0, 0, endwhile_lbl));
      gen_statement(node.body, asm, acc);
      asm.push(mips_j(while_lbl));
      asm.push(endwhile_lbl + ": \n");
      acc.loop_exit = oldloopexit;
      acc.loop_start = oldloopstart;
      break;
    case 'break':
      asm.push(mips_j(acc.loop_exit));
      break;
    case 'continue':
      asm.push(mips_j(acc.loop_start));
      break;
    case 'declaration':
      if(node.value !== null) {
        throw { message: "todo: declaration initializers" };
      }
      break;
    default:
      throw { message: "could not gen for: " + node.node_type };
  }
}

function gen_expr(node, rr, asm, acc) {
  var i;
  switch(node.node_type) {
    case 'expression':
      for(i = 0; i < node.seqs.length - 1; i++) {
        gen_expr(node.seqs[i], rZERO, asm, acc);
      }
      gen_expr(node.seqs[i], rr, asm, acc);
      break;
    case '+':
      gen_expr(node.targets[0], rV0, asm, acc);
      asm.push(mips_push(rV0));
      gen_expr(node.targets[1], rV1, asm, acc);
      asm.push(mips_pop(rV0));
      asm.push(mips_add(rr, rV0, rV1));
      break;
    case '-':
      gen_expr(node.targets[0], rV0, asm, acc);
      asm.push(mips_push(rV0));
      gen_expr(node.targets[1], rV1, asm, acc);
      asm.push(mips_pop(rV0));
      asm.push(mips_sub(rr, rV0, rV1));
      break;
    case '*':
      gen_expr(node.targets[0], rV0, asm, acc);
      asm.push(mips_push(rV0));
      gen_expr(node.targets[1], rV1, asm, acc);
      asm.push(mips_pop(rV0));
      asm.push(mips_mult(rV0, rV1));
      asm.push(mips_mflo(rr));
      break;
    case 'constant':
      asm.push(mips_addi(rr, rZERO, node.value.value));
      break;
    default:
      throw { message: "could not gen for: " + node.node_type };
  }
}

function mips_push(src) { return 'push $' + src + '\n'; }
function mips_pop(src)  { return 'pop $' + src + '\n'; }

function mips_add(dst, src1, src2) { return 'add $' + dst + ', $' + src1 + ', $' + src2 + '\n'; }
function mips_addi(dst, src1, src2) { return 'addi $' + dst + ', $' + src1 + ', ' + src2 + '\n'; }
function mips_sub(dst, src1, src2) { return 'sub $' + dst + ', $' + src1 + ', $' + src2 + '\n'; }
function mips_mult(src1, src2)     { return 'mult $' + src1 + ', $' + src2 + '\n'; }

function mips_mflo(dst) { return 'mflo $' + dst + '\n'; }
function mips_mfhi(dst) { return 'mfhi $' + dst + '\n'; }

function mips_bne(src1, src2, loc) { return 'bne $' + src1 + ', $' + src2 + ', ' + loc + '\n'; }
function mips_beq(src1, src2, loc) { return 'beq $' + src1 + ', $' + src2 + ', ' + loc + '\n'; }
function mips_j(loc) { return "j " + loc + "\n"; }

function mips_jr(src) { return 'jr $' + src + '\n'; }
