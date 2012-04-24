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

function contains(arr, v) {
  for(var i = 0; i < arr.length; ++i) {
    if(arr[i] === v)
      return true;
  }
  return false;
}

function assert_typeclass(node, typeclass) {
  switch(typeclass) {
    case INTEGER:
      if((node.type.basetype !== "int") || contains(node.type.qualifiers, "*")) {
        throw "Type mismatch: Got "+node.type.basetype+" base type, expected integer typeclass.";
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

function ridecl_name(decl) {
  if(typeof(decl.name) === "string") {
    return decl.name;
  } else {
    assert(decl.name.node_type !== undefined);
    switch(decl.name.node_type) {
      case "pointer_declarator":
        return decl.name.direct_decl;
        break;
    }
  }
  return "unnamed";
}

function rdecl_basetype(decl) {
  assert(decl.node_type === "decl");
  return decl.type[decl.type.length-1];
}

function rdecl_qualifiers(decl) {
  assert(decl.node_type === "decl");
  return decl.type.slice(0, decl.type.length-1);
}

function ridecl_qualifiers(decl) {
  if(typeof(decl.name) === "string") {
    return [];
  } else {
    assert(decl.name.node_type !== undefined);
    switch(decl.name.node_type) {
      case "pointer_declarator":
        return decl.name.pointer;
        break;
    }
  }
  return "unnamed";
}

function collect_symbols(node, accu) {
  switch(node.node_type) {
    case "root":
    case "block":
      node.symbols = new Object();
      return node.symbols;
    case "decl":
      if(node.decls !== undefined) {
        for(var i = 0;i < node.decls.length;i++) {
          if(accu[ridecl_name(node.decls[i])] !== undefined) {
            throw "Name redefined: "+ridecl_name(node.decls[i])+".";
          }
          var res = new Object();
          res.basetype = rdecl_basetype(node);
          res.qualifiers = rdecl_qualifiers(node).concat(ridecl_qualifiers(node.decls[i]));
          accu[ridecl_name(node.decls[i])] = res;
        }
      }
      break;
  }
  return accu;
}

function int_type_obj() {
  res = new Object();
  res.basetype = "int";
  res.qualifiers = [];
  return res;
}

function  well_typed(node, accu) {
  switch(node.node_type) {
    case "expression":
      node.type = node.seqs[node.seqs.length-1].type;
      break;
    case "init_decl":
      assert_typeclass(node.value, INTEGER);
      break;
    case "primary_expression_const":
      node.type = int_type_obj();
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
      //TODO: not even done in parser
      break;
    case "*":
    case "/":
    case "%":
    case ">>":
    case "<<":
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = int_type_obj();
      break; 
    case "+":
      //TODO: pointers
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = int_type_obj();
      break; 
    case "-":
      //TODO: pointers
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = int_type_obj();
      break;
    case "<":
    case ">":
    case "<=":
    case ">=":
    case "==":
    case "!=":
      //TODO: pointers
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = int_type_obj();
      break;
    case "&":
    case "^":
    case "|":
    case "&&":
    case "||":
      //TODO: pointers??
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = int_type_obj();
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
      node.type = int_type_obj();
      break;
    case "+=":
    case "-=":
      //TODO: pointers
      node.targets.map(function(x){assert_typeclass(x, INTEGER);});
      node.type = int_type_obj();
      break;
  }
}

function typecheck(ast) {
  ast_walk_down_b(ast, link_parents, undefined);
  var global_st = Object();
  ast_walk_down_b(ast, collect_symbols, global_st);

  ast_walk_up(ast, well_typed, undefined);
}

