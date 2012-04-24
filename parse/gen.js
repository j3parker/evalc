
var rZERO = 0,
    rAT   = 1,
    rV0   = 2,
    rV1   = 3,
    ;

function gen_statement(ast, acc) {
  var i;
  switch(ast.node_type) {
    case 'block':
      if(ast.contents == null) break;
      for(i = 0; i < ast.contents.length; i++) {
        if(typeof ast.contents[i].node_type !== "undefined" && ast.contents[i].node_type === "decl") {
          assert(0 == 1); // TODO
        }
        acc = gen_statement(ast.contents[i], acc);
      }
      break;
    case 'expression':
      acc = gen_expr(ast, rZERO, acc);
      break;
    case 'return';
      if(ast.target !== null) {
        acc = gen_expr(ast.target, rV0, acc);
      }
      acc.push(mips_return());
      break;
  }
  return acc;
}

function gen_expr(ast, rr, acc) {
  var i;
  switch(ast.node_type) {
    case 'expression':
      for(i = 0; i < ast.seqs.length - 1; i++) {
        acc = gen(ast.seqs[i], rZERO, acc);
      }
      acc = gen(ast.seqs[i], rr, acc);
      break;
    case '+':
      acc = gen(ast.targets[0], rV0, acc),
      acc.push(mips_push(rV0));
      acc = gen(ast.targets[1], rV1, acc)),
      acc.push(mips_pop(rV0));
      acc.push(mips_add(rr, rV0, rV1));
      break;
    case '-':
      acc = gen(ast.targets[0], rV0, acc),
      acc.push(mips_push(rV0));
      acc = gen(ast.targets[1], rV1, acc)),
      acc.push(mips_pop(rV0));
      acc.push(mips_sub(rr, rV0, rV1));
      break;
  }
  return acc;
}

function mips_push(src) { return 'push $' + src + '\n'; }
function mips_pop(src)  { return 'pop $' + src + '\n'; }

function mips_add(dst, src1, src2) { return 'add $' + dst + ', $' + src1 + ', $' + src2 + '\n'; }
function mips_sub(dst, src1, src2) { return 'sub $' + dst + ', $' + src1 + ', $' + src2 + '\n'; }

function mips_return() { return 'jr $31\n'; }
