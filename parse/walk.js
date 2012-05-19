function copy_type(x) {
  assert(x.node_type === "type");
  var res = new Object();
  res.node_type = "type";
  res.base_type = x.base_type;
  res.storage = x.storage;
  res.qualifiers = x.qualifiers;
  res.lvalue = x.lvalue;
  res.return_type = x.return_type;
  res.params = x.params;
  return res;
}

function assert(cond, msg) {
  if(!cond) {
    throw { message: "Assertion from function " + arguments.callee.caller.name + ": " + msg  };
  }
}

// Determines if two types are implicitly coercible
function unifiable(x,y) {
  return x.base_type[0] === y.base_type[0]; // TODO
}

function pretty_print_type(t) {
  return t.base_type; // TODO: finish this!
}

function make_basic_type(t) {
  return { node_type: "type",
           base_type: [t],
           function_specifiers: [],
           qualifiers: [],
           storage: [],
           lvalue: false
         };
}

function add_symbol(syms, def) {
  assert(typeof syms !== "undefined", "parent scope undefined");
  assert(typeof def.name !== "undefined", "def.vars.name undefined");
  assert(def.name !== "", "attempted to add an anonymous definition to the symbol table.");
  if(typeof syms[":" + def.name] === "undefined") { syms[":" + def.name] = def; }
  else { throw { message: "duplicated definition of " + def.name}; }
}

function find_symbol(node, name) {
  assert(typeof node !== "undefined", "asked to find a symbol in null");
  if(typeof node.symbols[":" + name] !== "undefined") {
    return node.symbols[":" + name];
  } else {
    if(node.parent == null) { // TODO: why does === not work?
      throw { message: "use of undeclared identifier " + name };
    } else {
      return find_symbol(node.parent, name);
    }
  }
}

function analyze(node, acc) {
  assert(typeof acc !== "undefined", "acc was undefined");
  assert(typeof node !== "undefined", "node was undefined");
  var i;
  if(node === null) return;
  assert(typeof node.node_type !== "undefined", "only analyze node_type's");
  switch(node.node_type) {
    case "root":
      node.symbols = new Object();
      node.parent = null;
      acc = { parent_scope: node, iteration_type: "" };
      for(i = 0; i < node.globals.length; i++) {
        if(node.globals[i].node_type === "declaration") {
          if(node.globals[i].name === "") { throw { message: "anonymous global definition: dumb, right?"}; }
          add_symbol(node.symbols, node.globals[i]);
        } else {
          analyze(node.globals[i], acc);
        }
      }
      break;
    case "function_definition":
      add_symbol(acc.parent_scope.symbols, node);
      node.symbols = new Object();
      node.parent = acc.parent_scope;
      newacc = { parent_scope: node, expected_return: node.type.return_type };
      for(i = 0; i < node.type.params.length; i++) {
        if(node.type.params[i].node_type !== "param") {
          throw { message: "bad param for function" };
        }
        add_symbol(node.symbols, node.type.params[i]);
      }
      analyze(node.body, newacc);
      break;
    case "block":
      node.symbols = new Object();
      node.parent = acc.parent_scope;
      var oldparent = acc.parent_scope;
      acc.parent_scope = node;
      for(i = 0; i < node.contents.length; i++) {
        analyze(node.contents[i], acc);
        if(node.contents[i].node_type === "declaration") {
          add_symbol(node.symbols, node.contents[i]);
        }
      }
      acc.parent_scope = oldparent;
      break;
    case "if":
      analyze(node.cond, acc); // TODO: make sure bool-able
      analyze(node.then, acc);
      analyze(node.else, acc);
      break;
    case "for":
      analyze(node.init, acc);
      analyze(node.cond, acc); // TODO: make sure output is bool-able
      analyze(node.action, acc);

      var olditertype = acc.iteration_type;
      acc.iteration_type = "loop";
      analyze(node.body, acc);
      acc.iteration_type = olditertype;
      break;
    case "while":
      analyze(node.cond, acc); // TODO: make sure output is bool-able

      var olditertype = acc.iteration_type;
      acc.iteration_type = "loop";
      analyze(node.body, acc);
      acc.iteration_type = olditertype;
      break;
    case "switch":
      analyze(node.param, acc); // TODO: make sure that the type of thi is legit
      var olditertype = acc.iteration_type;
      acc.iteration_type = "switch";
      analyze(node.body, acc);
      acc.iteration_type = olditertype;
      break;
    case "declaration":
      if(node.value === null) break;
      analyze(node.value, acc);
      if(!unifiable(node.type, node.value.type)) {
        throw { message: "bad decl initializer" };
      }
      break;
    case "return":
      if(node.target === null) {
        if(!unifiable(acc.expected_return, make_basic_type("void"))) {
          throw { message: "returning void from non-void function."};
        }
      } else {
        analyze(node.target, acc);
        assert(typeof node.target.type !== "undefined", "went into return, got null type?");
        if(!unifiable(acc.expected_return, node.target.type)) {
          throw { message: "return: expected " + pretty_print_type(acc.expected_return)
                           + " got " + pretty_print_type(node.target.type) };
        }
      }
      break;
    case "break":
      if(acc.iteration_type !== "loop" && acc.iteration_type !== "switch") {
        throw { message: "break statement not within a loop or switch." };
      }
      break;
    case "continue":
      if(acc.iteration_type !== "loop") {
        throw { message: "continue statement not within a loop." };
      }
      break;
    case "case":
      if(acc.iteration_type !== "switch") {
        throw { message: "case label statement not within a switch." };
      }
      analyze(node.guard, acc); // TODO: type check this (needs to reduce to integer constant)
      break;
    case "default":
      if(acc.iteration_type !== "switch") {
        throw { message: "default label statement not within a switch."};
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
      node.type = copy_type(node.seqs[node.seqs.length - 1].type);
      break;
    case "function_call":
      analyze(node.func, acc);
      if(typeof node.func.type.return_type === "undefined") {
        throw { message: "non-function in function call position."};
      }
      if(node.func.type.params.length !== node.args.length) { // TODO: varargs
        throw { message: "number of arguments mismatch."};
      }
      for(i = 0; i < node.args.length; i++) {
        analyze(node.args[i], acc);
        if(!unifiable(node.args[i].type, node.func.type.params[i].type)) {
          throw { message: "type mismatch in function call."};
        }
      }
      node.type = copy_type(node.func.type.return_type);
      break;
    case "<": // TODO: boolean stuff
    case ">":
    case "==":
    case "<=":
    case ">=":
    case "!=":
    case "+":
    case "-":
    case "*":
    case "/":
      analyze(node.targets[0], acc);
      analyze(node.targets[1], acc);
      if(!unifiable(node.targets[0].type, node.targets[1].type)) {
        throw {message: "bad binop types."};
      }
      node.type = copy_type(node.targets[0].type);
      node.type.lvalue = false;
      break;
    case "post++":
    case "post--":
    case "pre--":
    case "pre++":
      analyze(node.target, acc);
      node.type = copy_type(node.target.type);
      if(node.type.lvalue !== true) {
        throw { message: "non-lvalue in increment/decrement."};
      }
      break;
    case "=":
      analyze(node.targets[0], acc);
      if(node.targets[0].type.lvalue !== true) {
        throw {message: "non-lvalue in assignment."};
      }
      analyze(node.targets[1], acc);
      if(!unifiable(node.targets[0].type, node.targets[1].type)) {
        throw {message: "assignment types mismatch."};
      }
      node.type = copy_type(node.targets[1].type);
      node.type.lvalue = false;
      break;
    case "unary*":
      throw {message: "sorry, no pointers yet!"};
      analyze(node.target, acc);
      // TODO: make sure node.type could be a pointer value
      // TODO: node.type should be made from node.target.type...
      node.type.lvalue = true;
      break;
    case "unary&":
      throw {message: "sorry, no pointers yet!"};
      analyze(node.target, acc);
      if(node.target.type.lvalue !== true) {
        throw { message: "expected lvalue"};
      }
      // TODO: construct node.type from node.target.type
      node.type.lvalue = false;
      break;
    case "constant":
      node.type = make_basic_type(node.value.node_type);
      break;
    case "identifier":
      node.type = copy_type(find_symbol(acc.parent_scope, node.expr).type);
      node.type.lvalue = true;
      break;
    default:
      throw {message: "analysis error: TODO: " + node.node_type };
  }
}
