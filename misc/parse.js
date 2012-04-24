;(function(exports, undefined) {

// Based on Douglas Crockford's TDOP JS parser

var scope;
var symbol_table = {};
var token;
var tokens;
var token_nr;

var operators = [';', ':'];

var itself = function () {
  return this;
};

var original_scope = {
    define: function (n) {
        var t = this.def[n.value];
        if (typeof t === "object") {
            n.error(t.reserved ? "Already reserved." : "Already defined.");
        }
        this.def[n.value] = n;
        n.reserved = false;
        n.nud      = itself;
        n.led      = null;
        n.std      = null;
        n.lbp      = 0;
        n.scope    = scope;
        return n;
    },
    find: function (n) {
        var e = this, o;
        while (true) {
            o = e.def[n];
            if (o && typeof o !== 'function') {
                return e.def[n];
            }
            e = e.parent;
            if (!e) {
                o = symbol_table[n];
                return o && typeof o !== 'function' ? o : symbol_table["(name)"];
            }
        }
    },
    pop: function () {
        scope = this.parent;
    },
    reserve: function (n) {
        if (n.arity !== "name" || n.reserved) {
            return;
        }
        var t = this.def[n.value];
        if (t) {
            if (t.reserved) {
                return;
            }
            if (t.arity === "name") {
                n.error("Already defined.");
            }
        }
        this.def[n.value] = n;
        n.reserved = true;
    }
};

var new_scope = function () {
    var s = scope;
    scope = Object.create(original_scope);
    scope.def = {};
    scope.parent = s;
    return scope;
};

var advance = function (id) {
    var a, o, t, v;
    if (id && token.id !== id) {
        token.error("Expected '" + id + "'.");
    }
    t = {type: "whitespace"};
    while(t.type == "whitespace") {
      t = tokens.get();
    }
    if(t.type=="(end)") {
        token = symbol_table["(end)"];
        return;
    }
    v = t.value;
    a = t.type;
    if (a === "name") {
        o = scope.find(v);
    } else if (operators.indexOf(a) != -1) {
        a = "operator";
        o = symbol_table[v];
        if (!o) {
            t.error("Unknown operator.");
        }
    } else if (a === "string" || a ===  "int" || a == "hexint") {
        o = symbol_table["(literal)"];
        a = "literal";
    } else {
        t.error("Unexpected token," + a);
    }

    token = Object.create(o);
    token.value = v;
    token.arity = a;
    return token;
};

var expression = function (rbp) {
    var left;
    var t = token;
    advance();
    left = t.nud();
    while (rbp < token.lbp) {
        t = token;
        advance();
        left = t.led(left);
    }
    return left;
};

var statement = function () {
    var n = token, v;

    if (n.std) {
        advance();
        scope.reserve(n);
        return n.std();
    }
    v = expression(0);
    if (!v.assignment && v.id !== "(") {
      v.error("Bad expression statement.");
    }
    advance(";");
    return v;
};

var statements = function () {
    var a = [], s;
    while (true) {
        if (token.id === "}" || token.id === "(end)") {
            break;
        }
        s = statement();
        if (s) {
            a.push(s);
        }
    }
    return a.length === 0 ? null : a.length === 1 ? a[0] : a;
};

var block = function () {
    var t = token;
    advance("{");
    return t.std();
};

var original_symbol = {
    nud: function () {
        this.error("Undefined.");
    },
    led: function (left) {
        this.error("Missing operator.");
    }
};

var symbol = function (id, bp) {
    var s = symbol_table[id];
    bp = bp || 0;
    if (s) {
        if (bp >= s.lbp) {
            s.lbp = bp;
        }
    } else {
        s = Object.create(original_symbol);
        s.id = s.value = id;
        s.lbp = bp;
        symbol_table[id] = s;
    }
    return s;
};

var constant = function (s, v) {
    var x = symbol(s);
    x.nud = function () {
        scope.reserve(this);
        this.value = symbol_table[this.id].value;
        this.arity = "literal";
        return this;
    };
    x.value = v;
    return x;
};

var infix = function (id, bp, led) {
    operators.push(id);
    var s = symbol(id, bp);
    s.led = led || function (left) {
        this.first = left;
        this.second = expression(bp);
        this.arity = "binary";
        return this;
    };
    return s;
};

var infixr = function (id, bp, led) {
    operators.push(id);
    var s = symbol(id, bp);
    s.led = led || function (left) {
        this.first = left;
        this.second = expression(bp - 1);
        this.arity = "binary";
        return this;
    };
    return s;
};

var assignment = function (id) {
    return infixr(id, 10, function (left) {
        if (left.id !== "." && left.id !== "[" && left.arity !== "name") {
            left.error("Bad lvalue.");
        }
        this.first = left;
        this.second = expression(9);
        this.assignment = true;
        this.arity = "binary";
        return this;
    });
};

var prefix = function (id, nud) {
    var s = symbol(id);
    s.nud = nud || function () {
        scope.reserve(this);
        this.first = expression(70);
        this.arity = "unary";
        return this;
    };
    return s;
};

var stmt = function (s, f) {
    var x = symbol(s);
    x.std = f;
    return x;
};

symbol("(end)");
symbol("(name)");
symbol(":");
symbol(";");
symbol(")");
symbol("]");
symbol("}");
symbol(",");
symbol("else");

constant("true", true);
constant("false", false);
constant("null", null);

symbol("(literal)").nud = itself;

symbol("this").nud = function () {
    scope.reserve(this);
    this.arity = "this";
    return this;
};

assignment("=");
assignment("+=");
assignment("-=");

infix("?", 20, function (left) {
    this.first = left;
    this.second = expression(0);
    advance(":");
    this.third = expression(0);
    this.arity = "ternary";
    return this;
});

infixr("&&", 30);
infixr("||", 30);

infixr("==", 40);
infixr("!=", 40);
infixr("<", 40);
infixr("<=", 40);
infixr(">", 40);
infixr(">=", 40);

infix("+", 50);
infix("-", 50);

infix("*", 60);
infix("/", 60);

infix("[", 80, function (left) {
    this.first = left;
    this.second = expression(0);
    this.arity = "binary";
    advance("]");
    return this;
});

infix("(", 80, function (left) {
    var a = [];
    if (left.id === "." || left.id === "[") {
        this.arity = "ternary";
        this.first = left.first;
        this.second = left.second;
        this.third = a;
    } else {
        this.arity = "binary";
        this.first = left;
        this.second = a;
        if ((left.arity !== "unary" || left.id !== "function") &&
                left.arity !== "name" && left.id !== "(" &&
                left.id !== "&&" && left.id !== "||" && left.id !== "?") {
            left.error("Expected a variable name.");
        }
    }
    if (token.id !== ")") {
        while (true) {
            a.push(expression(0));
            if (token.id !== ",") {
                break;
            }
            advance(",");
        }
    }
    advance(")");
    return this;
});


prefix("!");
prefix("-");
prefix("typeof");

prefix("(", function () {
    var e = expression(0);
    advance(")");
    return e;
});

prefix("function", function () {
    var a = [];
    new_scope();
    if (token.arity === "name") {
        scope.define(token);
        this.name = token.value;
        advance();
    }
    advance("(");
    if (token.id !== ")") {
        while (true) {
            if (token.arity !== "name") {
                token.error("Expected a parameter name.");
            }
            scope.define(token);
            a.push(token);
            advance();
            if (token.id !== ",") {
                break;
            }
            advance(",");
        }
    }
    this.first = a;
    advance(")");
    advance("{");
    this.second = statements();
    advance("}");
    this.arity = "function";
    scope.pop();
    return this;
});

prefix("[", function () {
    var a = [];
    if (token.id !== "]") {
        while (true) {
            a.push(expression(0));
            if (token.id !== ",") {
                break;
            }
            advance(",");
        }
    }
    advance("]");
    this.first = a;
    this.arity = "unary";
    return this;
});

/* block scope */
stmt("{", function () {
    new_scope();
    var a = statements();
    advance("}");
    scope.pop();
    return a;
});

stmt("type", function () {
    var a = [], n, t;
    while (true) {
        n = token;
        if (n.arity !== "name") {
            n.error("Expected a new variable name.");
        }
        scope.define(n);
        advance();
        if (token.id === "=") {
            t = token;
            advance("=");
            t.first = n;
            t.second = expression(0);
            t.arity = "binary";
            a.push(t);
        }
        if (token.id !== ",") {
            break;
        }
        advance(",");
    }
    advance(";");
    return a.length === 0 ? null : a.length === 1 ? a[0] : a;
});

stmt("if", function () {
    advance("(");
    this.first = expression(0);
    advance(")");
    this.second = block();
    if (token.id === "else") {
        scope.reserve(token);
        advance("else");
        this.third = token.id === "if" ? statement() : block();
    } else {
        this.third = null;
    }
    this.arity = "statement";
    return this;
});

stmt("return", function () {
    if (token.id !== ";") {
        this.first = expression(0);
    }
    advance(";");
    this.arity = "statement";
    return this;
});

stmt("break", function () {
    advance(";");
    this.arity = "statement";
    return this;
});

stmt("while", function () {
    advance("(");
    this.first = expression(0);
    advance(")");
    this.second = block();
    this.arity = "statement";
    return this;
});

exports.parse = function(_tokens) {
  tokens = _tokens; 
  new_scope();
  advance();
  var s = statements();
  advance("(end)");
  scope.pop();
  return s;
}
})(exports);
