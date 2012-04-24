function ast_walk_up(ast, f, initacc) {
  if((typeof(ast) !== "object") && (typeof(ast) !== "array"))
    return initacc;

  if(ast["t"] !== undefined) {
    for(var i = 0; i < ast.t.length; i++) {
      initacc = ast_walk_up(ast.t[i], f, initacc);
    }
  } else if((ast["node_type"] === undefined) && ((typeof(ast) === "object") || (typeof(ast) === "array"))) {
    for(var i = 0; i < ast.length; i++) {
      initacc = ast_walk_up(ast[i], f, initacc);
    }
  }

  if(ast["node_type"] !== undefined) {
    initacc = f(ast, initacc);
  }

  return initacc;
}

function ast_walk_down_b(ast, f, initacc) {
  if((typeof(ast) !== "object") && (typeof(ast) !== "array"))
    return initacc;

  if(ast["node_type"] !== undefined) {
    initacc = f(ast, initacc);
  }

  if(ast["t"] !== undefined) {
    for(var i = 0; i < ast.t.length; i++) {
      ast_walk_down_b(ast.t[i], f, initacc);
    }
  } else if((ast["node_type"] === undefined) && ((typeof(ast) === "object") || (typeof(ast) === "array"))) {
    for(var i = 0; i < ast.length; i++) {
      ast_walk_down_b(ast[i], f, initacc);
    }
  }

  return initacc;
}

var INTEGER = 0;

function get_typeof_id(node, id) {
  if(node === undefined)
    return undefined;
  if(node.node_type === "block") {
    if(node.symbols[id] !== undefined) {
      return node.symbols[id];
    }
  }
  return get_typeof_id(node.parent, id);
}

function assert_typeclass(node, typeclass) {
  switch(typeclass) {
    case INTEGER:
      if(node.type != "int") {
        throw "Type mismatch: Got "+tc.type+", expected integer.";
      }
      break;
  }
}

function assert(cond) {
  if(!cond) {
    throw "assert failed.";
  }
}

function link_parents(node, accu) {
  node.parent = accu;
  return node;
}

function collect_symbols(node, accu) {
  switch(node.node_type) {
    case "block":
      node.symbols = new Object();
      return node.symbols;
    case "decl":
      if(node.decls !== undefined) {
        for(var i = 0;i < node.decls.length;i++) {
          if(accu[node.decls[i].name] !== undefined) {
            throw "Name redefined: "+node.decls[i].name+".";
          }
          accu[node.decls[i].name] = node.type;
        }
      }
      break;
  }
  return accu;
}

function  well_typed(node, accu) {
  switch(node.node_type) {
    case "expression":
      node.type = node.seqs[node.seqs.length-1].type;
      break;
    case "decl":
      // TODO: typecheck decls.
      break;
    case "primary_expression_const":
      node.type = "int";
      break;
    case "primary_expression_id":
      node.type = get_typeof_id(node, node.expr);
      break;
    case "function_call":
      // TODO: arguments match. to type: return.
      break;
    case ".":
      // TODO: LHS is a struct instance, RHS is a field. to type: RHS type -> typeof expr
      break;
    case "post++":
    case "post--":
    case "pre++":
    case "pre--":
      assert_typeclass(node.target, INTEGER);
      node.type = node.target.type;
      break;
    case "unary&":
      node.type = type_reference(node.target);
      break;
    case "unary*":
      node.type = type_dereference(node.target);
      break;
    case "unary+":
    case "unary-":
    case "unary~":
    case "unary!":
      assert_typeclass(node.target, INTEGER);
      node.type = node.target.type;
      break;
    case "typecast":
      // already done in the ast construction. TODO might want to verify cast.
      break;
    case "*":
    case "/":
    case "%":
    case ">>":
    case "<<":
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = "int";
      break; 
    case "+":
      //TODO: pointers
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = "int";
      break; 
    case "-":
      //TODO: pointers
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = "int";
      break;
    case "<":
    case ">":
    case "<=":
    case ">=":
    case "==":
    case "!=":
      //TODO: pointers
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = "int";
      break;
    case "&":
    case "^":
    case "|":
    case "&&":
    case "||":
      //TODO: pointers??
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = "int";
      break;
    case "?":
      assert(node.targets[1].type == node.targets[2].type);
      assert_typeclass(node.targets[0], INTEGER);
      node.type = node.targets[1].type;
      break;
    case "=":
    case "*=":
    case "/=":
    case "%=":
    case "<<=":
    case ">>=":
    case "&=":
    case "^=":
    case "|=":
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = "int";
      break;
    case "+=":
    case "-=":
      //TODO: pointers
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = "int";
      break;
  }
}

function typecheck(ast) {
  ast_walk_down_b(ast, link_parents, undefined);
  var global_st = Object();
  ast_walk_down_b(ast, collect_symbols, global_st);

  console.log("globals:");
  console.log(global_st);

  ast_walk_up(ast, well_typed, undefined);
}

