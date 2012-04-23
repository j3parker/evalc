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
