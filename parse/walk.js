function ast_walk_up(ast, f, initacc) {
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
  if(node === undefined) {
    throw "undeclared identifier: " + id;
  }
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

function assert(cond, msg) {
  if(!cond) {
    console.log("Assertion from function " + arguments.callee.caller.name + "failed: " + msg);
    var trace = printStackTrace();
    console.log(trace.join('\n'));
    throw false;
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
  var i, res;
  switch(node.node_type) {
    case "root":
    case "block":
      node.symbols = new Object();
      return node.symbols;
    case "decl":
      for(i = 0;i < node.decls.length;i++) {
        if(accu[ridecl_name(node.decls[i])] !== undefined) {
          throw "Name redefined: "+ridecl_name(node.decls[i])+".";
        }
        res = new Object();
        res.kind = "data";
        res.basetype = rdecl_basetype(node);
        res.qualifiers = rdecl_qualifiers(node).concat(ridecl_qualifiers(node.decls[i]));
        accu[ridecl_name(node.decls[i])] = res;
      }
      break;
    case "function_definition":
      res = new Object();
      res.kind = "function";
      res.returntype = INTEGER; // TODO
      res.argtypes = []; // TODO
      break;
    case "return":

      break;
    default:
      throw "the fuck2 " + node.node_type;
  }
  return accu;
}

function int_type_obj() {
  res = new Object();
  res.basetype = "int";
  res.qualifiers = [];
  return res;
}

function void_type_obj() {
  res = new Object();
  res.basetype = "void";
  res.qualifiers = [];
  return res;
}

function  well_typed(node, accu) {
  switch(node.node_type) {
    case "expression":
      if(node.seqs.length == 0) {
        node.type = void_type_obj();
      } else {
        node.type = node.seqs[node.seqs.length-1].type;
      }
      break;
    case "init_decl":
      if(node.value !== null) {
        assert_typeclass(node.value, INTEGER);
      }
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
    case "return":
      if(node.target == null) { node.type == void_type_obj(); }
      else { node.type = node.target.type; }
      break;
    case "if":
    case "block":
    case "function_definition":
    case "root":
    case "decl":
      break;
  }
}

// Determines if two types are implicitly coercible
function unifiable(x,y) {
  return true; // TODO: fix!
}

function pretty_print_type(t) {
  return t.base_type[0]; // TODO: finish this!
}

function make_basic_type(t) {
  return { node_type: "type",
           base_type: [t],
           function_specifiers: [],
           qualifiers: [],
           storage: []
         };
}

function add_symbol(syms, def) {
  assert(typeof syms !== "undefined", "parent scope undefined");
  assert(typeof def.name !== "undefined", "def.vars.name undefined");
  assert(def.name !== "", "attempted to add an anonymous definition to the symbol table.");
  if(typeof syms[def.name] === "undefined") { syms[def.name] = def; }
  else { throw "duplicated definition of " + def.name; }
}

function find_symbol(node, name) {
  assert(typeof node !== "undefined", "asked to find a symbol in null");
  if(typeof node.symbols[name] !== "undefined") {
    return node.symbols[name];
  } else {
    if(node.parent === null) {
      throw "use of undeclared identifier " + name;
    } else {
      console.log('ascending above ' + node.node_type);
      return find_symbol(node.parent, name);
    }
  }
}

function analyze(node, acc) {
  var i, newacc;
  assert(typeof node !== "undefined", "asked to analyze null");
  assert(typeof node.node_type !== "undefined", "only analyze node_type's");
  switch(node.node_type) {
    case "root":
      node.symbols = new Array();
      node.parent = null;
      newacc = { parent_scope: node };
      for(i = 0; i < node.globals.length; i++) {
        analyze(node.globals[i], newacc);
        if(node.globals[i].node_type === "declaration") {
          if(node.globals[i].name === "") { throw "anonymous global definition: dumb, right?"; }
          add_symbol(node.symbols, node.globals[i]);
        }
      }
      break;
    case "function_definition":
      // TODO: add ourself to the global symbol table in my parent
      newacc = { expected_return: node.return_type};
      // TODO: here we should think about our arguments, add them to our symbol table (inside our child block)
      analyze(node.body, newacc);
      break;
    case "block":
      node.symbols = new Array();
      node.parent = acc.parent_scope;
      acc.parent_scope = node;
      for(i = 0; i < node.contents.length; i++) {
        if(node.contents[i].node_type === "declaration") {
          add_symbol(node.symbols, node.contents[i]);
        } else {
          analyze(node.contents[i], acc);
        }
      }
      break;
    case "return":
      if(node.target === null) {
        node.type = make_basic_type("void");
      } else {
        analyze(node.target, acc);
        assert(typeof node.target.type !== "undefined", "went into return, got null type?");
        if(!unifiable(acc.expected_return, node.target.type)) {
          throw "return: expected " + pretty_print_type(acc.expected_return)
                          + " got " + pretty_print_type(node.target.type);
        }
        node.type = node.target.type; // TODO: more complicated of course
      }
      break;
    case "expression":
      if(node.seqs.length == 0) {
        node.type = make_basic_type("void");
        break;
      }
      for(i = 0; i < node.seqs.length; i++) {
        analyze(node.seqs[i], acc);
      }
      node.type = node.seqs[node.seqs.length - 1].type;
      break;
    case "constant":
      // TODO: implement actual algorithm described on page 55-56
      node.type = make_basic_type("int");
      break;
    case "identifier":
      node.type = find_symbol(acc.parent_scope, node.expr);
      //console.log('ping');
      break;
    default:
      throw "the fuck? " + node.node_type;
  }
}

function typecheck(ast) {
  ast_walk_down_b(ast, link_parents, undefined);

  analyze(ast);
//  var global_st = Object();
//  ast_walk_down_b(ast, collect_symbols, global_st);

//  ast_walk_up(ast, well_typed, undefined);
}

