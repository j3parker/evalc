function MakeGenSym(prefix) {
  var i = 0;
  var res = function() { return prefix + i++; };
  res.reset = function() { i = 0; };
  return res;
}

function MakeRegisterTable() {
  var regs = new Array(23);
  var res = new Object();
  var time = 0;
  offset = 6;
  res.get_reg = function(obj, asm) {
    var LRUslot = null;
    var mintime = 100;
    // First, look for an empty register.
    for(var i = 0; i < regs.length; i++) {
      if(regs[i] == null) {
        res.set_reg(i + offset, obj);
        return { reg: i + offset, restore: false };
      }
      else if(regs[i] != null && regs[i].t < mintime) {
        mintime = regs[i].t;
        LRUslot = i;
      }
    }

    // Ok, spill a temporary value to the stack.
    // TODO: vars that haven't been serialized to the stack yet
    asm.push(mips_push(LRUslot + offset));
    res.set_reg(LRUslot + offset, obj);
    return { reg: LRUslot + offset, restore: true };
  }
  res.check_regs = function(obj) {
    for(var i = 0; i < regs.length; i++) {
      if(regs[i] == null) continue;
      if(typeof regs[i] === 'string') continue;
      if(regs[i].d === obj) return i + offset;
    }
    return null;
  }
  res.set_reg = function(reg, obj) {
    regs[reg - offset] = { d: obj, t: time };
    time++;
  }
  res.invalidate_all = function() {
    for (var i = 0; i < regs.length; i++) {
      regs[i] = null;
    }
    time = 0;
  }
  res.invalidate = function(i) {
    if(i == 0) return;
    if(regs[i - offset] == null) return;
    if(typeof regs[i - offset].d !== 'string') return;
    regs[i - offset] = null;
  }
  res.reserve = function(i) {
    if(i == 0 || i > 5) throw { message: 'tried to reserve register ' + i + '.' };
    regs[i - 2]
  }
  res.invalidate_all();
  return res;
}

var while_gensym = MakeGenSym('while_');
var endwhile_gensym = MakeGenSym('endwhile_');
var else_gensym = MakeGenSym('else_');
var endif_gensym = MakeGenSym('endif_');
var for_gensym = MakeGenSym('for_');
var endfor_gensym = MakeGenSym('endfor_');

var rSP = 29,
    rFP = 30,
    rLR = 31;

function gen(node) {
  while_gensym.reset();
  endwhile_gensym.reset();
  else_gensym.reset();
  endif_gensym.reset();
  for_gensym.reset();
  endfor_gensym.reset();
  var asm = new Array();
  var acc = new Object();
  acc.regs = MakeRegisterTable();
  acc.scope = null;
  for(var i = 0; i < node.globals.length; i++) {
    gen_statement(node.globals[i], asm, acc);
  }
  return asm;
}

function alloc_size(x) { return 4; }

function gen_statement(node, asm, acc) {
  var i;
  switch(node.node_type) {
    case 'block':
      if(node.contents == null) break;
      var len = 0;
      if(typeof node.symbols === 'undefined') throw {message: 'what'};
      for(sym in node.symbols) {
        if(node.symbols.hasOwnProperty(sym)) {
          len += alloc_size(node.symbols[sym].type);
          node.symbols[sym].loc = acc.fp_offset + len;
        }
      }
      if(len != 0) {
        asm.push(mips_allocai(len));
      }
      acc.fp_offset += len;
      var oldscope = acc.scope;
      acc.scope = node;
      for(i = 0; i < node.contents.length; i++) {
        if(typeof node.contents[i].node_type !== 'undefined' && node.contents[i].node_type === 'decl') {
          assert(0 == 1); // TODO what?
        }
        gen_statement(node.contents[i], asm, acc);
      }
      acc.scope = oldscope;
      break;
    case 'expression':
      var src1 = gen_expr(node, asm, acc);
      break;
    case 'return':
      var src1 = 0;
      if(node.target !== null) {
        var src1 = gen_expr(node.target, asm, acc);
      }
      asm.push(mips_ret(src1));
      acc.regs.invalidate(src1);
      break;
    case 'function_definition':
      asm.push(node.name + ':\n');
      acc.fp_offset = 0;
      var len = 0;
      for(i = node.type.params.length - 1; i >= 4; i--) {
        len += alloc_size(node.type.params[i].type);
        node.symbols[':'+ node.type.params[i].name].loc = -len - 25*4;
      }
      for(i = 0; i < Math.min(4, node.type.params.length); i++) {
        var dst = acc.regs.get_reg(find_symbol(node, node.type.params[i].name));
        asm.push(mips_add(dst.reg, 0, i + 2));
      }
      gen_statement(node.body, asm, acc);
      // TODO: should output a return-canary here...
      asm.push('\n');
      acc.regs.invalidate_all();
      break;
    case 'if':
      var src1 = gen_expr(node.cond, asm, acc);
      acc.regs.invalidate(src1);
      if(node.else !== null) else_lbl = else_gensym();
      endif_lbl = endif_gensym();
      if(node.else !== null) asm.push(mips_beq(0, src1, else_lbl));
      else                   asm.push(mips_beq(0, src1, endif_lbl));
      gen_statement(node.then, asm, acc);
      if(node.else !== null) {
        asm.push(else_lbl + ': ');
        gen_statement(node.else, asm, acc);
      } else {
        asm.push(endif_lbl + ': \n');
      }
      break;
    case 'for':
      for_lbl = for_gensym();
      endfor_lbl = endfor_gensym();
      var oldloopstart = acc.loop_start;
      var oldloopexit = acc.loop_exit;
      acc.loop_start = for_lbl;
      acc.loop_exit = endfor_lbl;
      var src1 = gen_expr(node.init, asm, acc);
      acc.regs.invalidate(src1);
      asm.push(for_lbl + ': ');
      var src1 = gen_expr(node.cond, asm, acc);
      acc.regs.invalidate(src1);
      asm.push(mips_beq(src1, 0, endfor_lbl));
      if(node.action !== null) {
        var src1 = gen_expr(node.action, asm, acc);
        acc.regs.invalidate(src1);
      }
      gen_statement(node.body, asm, acc);
      asm.push(mips_j(for_lbl));
      asm.push(endfor_lbl + ': ');
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
      asm.push(while_lbl + ': ');
      var src1 = gen_expr(node.cond, asm, acc);
      acc.regs.invalidate(src1);
      asm.push(mips_beq(src1, 0, endwhile_lbl));
      gen_statement(node.body, asm, acc);
      asm.push(mips_j(while_lbl));
      asm.push(endwhile_lbl + ': \n');
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
        throw { message: 'todo: declaration initializers' };
      }
      break;
    default:
      throw { message: 'could not gen for: ' + node.node_type };
  }
}

function gen_expr(node, asm, acc) {
  var i;
  var dst = null;
  if(typeof acc.dst !== 'undefined') {
    dst = acc.dst;
    delete acc.dst;
  }
  switch(node.node_type) {
    case 'expression':
      for(i = 0; i < node.seqs.length - 1; i++) {
        acc.dst = 0;
        var src1 = gen_expr(node.seqs[i], asm, acc);
        acc.regs.invalidate(src1);
      }
      acc.dst = dst;
      var dst = gen_expr(node.seqs[i], asm, acc);
      return dst;
    case 'function_call':
      for(var i = 0; i < node.args.length; i++) {
        if(i < 4) { acc.dst = i + 2; }
        var src1 = gen_expr(node.args[i], asm, acc);
        if(i >= 4) {
          asm.push(mips_push(src1));
          acc.regs.invalidate(src1);
        }
      }
      asm.push(mips_call(node.func.expr)); // TODO you wish!
      for(var i = 0; i < Math.min(4, node.args.length); i++) { acc.regs.invalidate(i + 2); }
      if(node.args.length > 4) asm.push(mips_popn(node.args.length - 4));
      if(dst === 0) return;
      if(dst === null) var dst = acc.regs.get_reg('temp', asm).reg;
      if(dst !== 1) asm.push(mips_add(dst,0,1));
      return dst;
    case '<':
    case '+':
    case '-':
    case '*':
    case '/':
      function gen_binop(op, dst, src1, src2) {
        switch(op) {
          case '<': return mips_slt(dst, src1, src2);
          case '+': return mips_add(dst, src1, src2);
          case '-': return mips_sub(dst, src1, src2);
          case '*': return mips_mult(dst, src1, src2);
          default: throw { message: "opps" };
        }
      }
      var src1 = gen_expr(node.targets[0], asm, acc);
      var src2 = gen_expr(node.targets[1], asm, acc);
      acc.regs.invalidate(src1);
      acc.regs.invalidate(src2);
      if(dst === 0) return 0;
      if(dst === null) dst = acc.regs.get_reg('temp', asm).reg;
      asm.push(gen_binop(node.node_type, dst, src1, src2));
      return dst;
    case 'constant':
      if(dst === 0) return 0;
      if(dst === null) {
        if(node.value.value == 0) return 0;
        dst = acc.regs.get_reg('temp', asm).reg;
      }
      asm.push(mips_addi(dst, 0, node.value.value));
      return dst;
    case 'identifier':
      if(dst === 0) return 0;
      var sym = find_symbol(acc.scope, node.expr);
      var src1 = acc.regs.check_regs(sym);
      if(src1 != null) {
        if(dst != null && dst !== src1) {
          asm.push(mips_add(dst,0,src1));
          return dst;
        }
        return src1;
      }
      if(dst == null) dst = acc.regs.get_reg(sym, asm);
      asm.push(mips_lw(dst.reg, rFP, sym.loc));
      return dst.reg;
    default:
      throw { message: 'could not gen for: ' + node.node_type };
  }
}

function mips_push(src) { return 'push $' + src + '\n'; }
function mips_pop(src)  { return 'pop $' + src + '\n'; }

function mips_add(dst, src1, src2)  { return 'add $' + dst + ', $' + src1 + ', $' + src2 + '\n'; }
function mips_addi(dst, src1, src2) { return 'addi $' + dst + ', $' + src1 + ', ' + src2 + '\n'; }
function mips_sub(dst, src1, src2)  { return 'sub $' + dst + ', $' + src1 + ', $' + src2 + '\n'; }
function mips_mult(dst, src1, src2) { return 'mult $' + src1 + ', $' + src2 + '\nmflo $' + dst +'\n'; }
function mips_slt(dst, src1, src2)  { return 'slt $' + dst + ', $' + src1 + ', $' + src2 + '\n'; }

function mips_mflo(dst) { return 'mflo $' + dst + '\n'; }
function mips_mfhi(dst) { return 'mfhi $' + dst + '\n'; }

function mips_bne(src1, src2, loc) { return 'bne $' + src1 + ', $' + src2 + ', ' + loc + '\n'; }
function mips_beq(src1, src2, loc) { return 'beq $' + src1 + ', $' + src2 + ', ' + loc + '\n'; }
function mips_j(loc) { return 'j ' + loc + '\n'; }

function mips_jr(src) { return 'jr $' + src + '\n'; }

function mips_lw(dst, src, off) { return 'lw $' + dst + ', ' + off + '($' + src + ')\n'; }

function mips_allocai(imm) { return 'allocai ' + imm + '\n'; }

function mips_call(dst) { return 'call ' + dst + '\n'; }
function mips_ret(src)     { return 'ret $' + src + '\n'; }
