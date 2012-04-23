function ast_walk(ast, f, initacc) {
  if((typeof(ast) !== "object") && (typeof(ast) !== "array"))
    return initacc;

  if(ast["t"] !== undefined) {
    for(var i = 0; i < ast.t.length; i++) {
      initacc = ast_walk(ast.t[i], f, initacc);
    }
  } else if((ast["node_type"] === undefined) && ((typeof(ast) === "object") || (typeof(ast) === "array"))) {
    for(var i = 0; i < ast.length; i++) {
      initacc = ast_walk(ast[i], f, initacc);
    }
  }

  if(ast["node_type"] !== undefined) {
    initacc = f(ast, initacc);
  }

  return initacc;
}

var INTEGER = 0;

function assert_typeclass(node, typeclass) {
  var tc;
  if(node.type === undefined) // sequence (comma)
  {
    tc = node[node.length-1];
  } else {
    tc = node;
  }
  switch(typeclass) {
    case INTEGER:
      if(tc.type != "int") {
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

function  well_typed(node, accu) {
  switch(node.node_type) {
    case "primary_expression_const":
      node.type = "int";
      break;
    case "primary_expression_id":
      // TODO: from symbol table
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

