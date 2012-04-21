/* description: Parses end executes mathematical expressions. */

/* lexical grammar */
%lex
%%

"auto"                return 'AUTO'
"break"               return 'BREAK'
"case"                return 'CASE'
"char"                return 'CHAR'
"const"               return 'CONST'
"continue"            return 'CONTINUE'
"default"             return 'DEFAULT'
"do"                  return 'DO'
"double"              return 'DOUBLE'
"else"                return 'ELSE'
"enum"                return 'ENUM'
"extern"              return 'EXTERN'
"float"               return 'FLOAT'
"for"                 return 'FOR'
"goto"                return 'GOTO'
"if"                  return 'IF'
"inline"              return 'INLINE'
"int"                 return 'INT'
"long"                return 'LONG'
"register"            return 'REGISTER'
"restrict"            return 'RESTRICT'
"return"              return 'RETURN'
"short"               return 'SHORT'
"signed"              return 'SIGNED'
"sizeof"              return 'SIZEOF'
"static"              return 'STATIC'
"struct"              return 'STRUCT'
"switch"              return 'SWITCH'
"typedef"             return 'TYPEDEF'
"union"               return 'UNION'
"unsigned"            return 'UNSIGNED'
"void"                return 'VOID'
"volatile"            return 'VOLATILE'
"while"               return 'WHILE'
"_Bool"               return '_BOOL'
"_Complex"            return '_COMPLEX'
"..."                 return 'ELLIPSIS'
">>="                 return 'RIGHT_ASSIGN'
"<<="                 return 'LEFT_ASSIGN'
"+="                  return 'ADD_ASSIGN'
"-="                  return 'SUB_ASSIGN'
"*="                  return 'MUL_ASSIGN'
"/="                  return 'DIV_ASSIGN'
"%="                  return 'MOD_ASSIGN'
"&="                  return 'AND_ASSIGN'
"^="                  return 'XOR_ASSIGN'
"|="                  return 'OR_ASSIGN'
">>"                  return 'RIGHT_OP'
"<<"                  return 'LEFT_OP'
"++"                  return 'INC_OP'
"--"                  return 'DEC_OP'
"->"                  return 'PTR_OP'
"&&"                  return 'AND_OP'
"||"                  return 'OR_OP'
"<="                  return 'LE_OP'
">="                  return 'GE_OP'
"=="                  return 'EQ_OP'
"!="                  return 'NE_OP'
";"                   return ';'
"{"                   return '{'
"}"                   return '}'
","                   return ','
":"                   return ':'
"="                   return '='
"("                   return '('
")"                   return ')'
"["                   return '['
"]"                   return ']'
"."                   return '.'
"&"                   return '&'
"!"                   return '!'
"~"                   return '~'
"-"                   return '-'
"+"                   return '+'
"*"                   return '*'
"/"                   return '/'
"%"                   return '%'
"<"                   return '<'
">"                   return '>'
"^"                   return '^'
"|"                   return "|"
"?"                   return "?"
\s+                   /* skip whitespace */
[a-zA-Z_][a-zA-Z_0-9]* return 'IDENTIFIER'
"0"[xX][a-fA-F0-9]+[uUlL]?   return 'CONSTANT'
[0-9]+[eE][-+]?[0-9]+[fFlL]? return 'CONSTANT'
[0-9]*"."[0-9]+([eE][-+]?[0-9]+)?[fFlL]? return 'CONSTANT'
[0-9]+"."[0-9]*([eE][-+]?[0-9]+)?[fFlL]? return 'CONSTANT'
[0-9]+                return 'CONSTANT'
"L"?"'"(\\.|[^\\'])+"'" return 'CONSTANT'
"L"?"\""(\\.|[^\\"])*"\"" return 'CONSTANT'
<<EOF>>               return 'EOF'

/lex

/* operator associations and precedence */

%start start

%% /* language grammar */

/* A.2.1 Expressions */

primary_expression
    : IDENTIFIER
    | CONSTANT
    | STRING_LITERAL
    | '(' expression ')' { $$ = $2; }
    ;

postfix_expression
    : primary_expression
    | postfix_expression '[' expression ']'
      {
        $$ = new Object();
        $$.node_type = 'unary*';
        $$.target = new Object();
        $$.target.node_type = "+";
        $$.target.targets = [$1, $3];
      }
    | postfix_expression '(' ')'
      {
        $$ = new Object();
        $$.node_type = "function_call";
        $$.func = $1;
        $$.args = [];
      }
    | postfix_expression '(' argument_expression_list ')'
      {
        $$ = new Object();
        $$.node_type = "function_call"
        $$.func = $1;
        $$.args = $3;
      }
    | postfix_expression '.' IDENTIFIER
      {
        $$ = new Object();
        $$.node_type = ".";
        $$.targets = [$1, $3];
      }
    | postfix_expression PTR_OP IDENTIFIER
      {
        var inner = new Object();
        inner.node_type = '*';
        inner.targets = [$1];
        $$ = new Object();
        $$.node_type = ".";
        $$.targets = [inner, $3];
      }
    | postfix_expression INC_OP
      {
        $$ = new Object();
        $$.node_type = "post++";
        $$.target = $1;
      }
    | postfix_expression DEC_OP
      {
        $$ = new Object();
        $$.node_type = "post--";
        $$.target = $1;
      }
    ;

argument_expression_list
    : assignment_expression { $$ = [$1]; }
    | argument_expression_list ',' assignment_expression
      {
        $1.push($3);
        $$ = $1;
      }
    ;

unary_expression
    : postfix_expression
    | INC_OP unary_expression
      {
        $$ = new Object();
        $$.node_type = "pre++";
        $$.target = $2;
      }
    | DEC_OP unary_expression
      {
        $$ = new Object();
        $$.node_type = "pre--";
        $$.target = $2;
      }
    | unary_operator cast_expression
      {
        $$ = new Object();
        $$.node_type = "unary" + $1;
        $$.target = $2;
      }
    | SIZEOF unary_expression
      {
        $$ = new Object();
        $$.node_type = "sizeof";
        $$.target = $2;
      }
    | SIZEOF '(' type_name ')'
      {
        $$ = new Object();
        $$.node_type = "sizeof";
        $$.target = $3;
      }
    ;

unary_operator
    : '&'
    | '+'
    | '*'
    | '-'
    | '~'
    | '!'
    ;

cast_expression

    : unary_expression
    | '(' type_name ')' cast_expression
      {
        $$ = new Object();
        $$.node_type = "typecast";
        $$.type = $2;
        $$.target = $4;
      }
    ;

multiplicative_expression
    : cast_expression
    | multiplicative_expression '*' cast_expression
      {
        $$ = new Object();
        $$.node_type = "*";
        $$.targets = [$1, $3];
      }
    | multiplicative_expression '/' cast_expression
      {
        $$ = new Object();
        $$.node_type = "/";
        $$.targets = [$1, $3];
      }
    | multiplicative_expression '%' cast_expression
      {
        $$ = new Object();
        $$.node_type = "%";
        $$.targets = [$1, $3];
      }
    ;

additive_expression
    : multiplicative_expression
    | additive_expression '+' multiplicative_expression
      {
        $$ = new Object();
        $$.node_type = "+";
        $$.target = [$1, $3];
      }
    | additive_expression '-' multiplicative_expression
      {
        $$ = new Object();
        $$.node_type = "-";
        $$.target = [$1, $3];
      }
    ;

shift_expression
    : additive_expression
    | shift_expression LEFT_OP additive_expression
      {
        $$ = new Object();
        $$.node_type = "<<";
        $$.targets = [$1, $3];
      }
    | shift_expression RIGHT_OP additive_expression
      {
        $$ = new Object();
        $$.node_type = ">>";
        $$.targets = [$1, $3];
      }
    ;

relational_expression
    : shift_expression
    | relational_expression '<' shift_expression
      {
        $$ = new Object();
        $$.node_type = "<";
        $$.targets = [$1, $3];
      }
    | relational_expression '>' shift_expression
      {
        $$ = new Object();
        $$.node_type = ">";
        $$.targets = [$1, $3];
      }
    | relational_expression LE_OP shift_expression
      {
        $$ = new Object();
        $$.node_type = "<=";
        $$.targets = [$1, $3];
      }
    | relational_expression GE_OP shift_expression
      {
        $$ = new Object();
        $$.node_type = ">=";
        $$.targets = [$1, $3];
      }
    ;

equality_expression
    : relational_expression
    | equality_expression EQ_OP relational_expression
      {
        $$ = new Object();
        $$.node_type = "==";
        $$.targets = [$1, $3];
      }
    | equality_expression NE_OP relational_expression
      {
        $$ = new Object();
        $$.node_type = "!=";
        $$.targets = [$1, $3];
      }
    ;

and_expression
    : equality_expression
    | and_expression '&' equality_expression
      {
        $$ = new Object();
        $$.node_type = "&";
        $$.targets = [$1, $3];
      }
    ;

exclusive_or_expression
    : and_expression
    | exclusive_or_expression '^' and_expression
      {
        $$ = new Object();
        $$.node_type = "^";
        $$.targets = [$1, $3];
      }
    ;

inclusive_or_expression
    : exclusive_or_expression
    | inclusive_or_expression '|' exclusive_or_expression
      {
        $$ = new Object();
        $$.node_type = "|";
        $$.targets = [$1, $3];
      }
    ;

logical_and_expression
    : inclusive_or_expression
    | logical_and_expression AND_OP inclusive_or_expression
      {
        $$ = new Object();
        $$.node_type = "&&";
        $$.targets = [$1, $3];
      }
    ;

logical_or_expression
    : logical_and_expression
    | logical_or_expression OR_OP logical_and_expression
      {
        $$ = new Object();
        $$.node_type = "||";
        $$.targets = [$1, $3];
      }
    ;

conditional_expression
    : logical_or_expression
    | logical_or_expression '?' expression ':' conditional_expression
      {
        $$ = new Object();
        $$.node_type = "?";
        $$.targets = [$1, $3, $5];
      }
    ;

assignment_expression
    : conditional_expression
    | unary_expression assignment_operator assignment_expression
      {
        $$ = new Object();
        $$.node_type = $2;
        $$.targets = [$1, $3];
      }
    ;

assignment_operator
    : '='
    | MUL_ASSIGN
    | DIV_ASSIGN
    | MOD_ASSIGN
    | ADD_ASSIGN
    | SUB_ASSIGN
    | LEFT_ASSIGN
    | RIGHT_ASSIGN
    | AND_ASSIGN
    | XOR_ASSIGN
    | OR_ASSIGN
    ;

expression
    : assignment_expression { $$ = [$1]; }
    | expression ',' assignment_expression
      {
        $1.push($3);
        $$ = $1;
      }
    ;

constant_expression
    : conditional_expression
    ;

/* A.2.2 Declarations */

declaration
    : declaration_specifiers ';'
      {
        $$ = new Object();
        $$.node_type = "decl";
        $$.type = $1;
      }
    | declaration_specifiers init_declarator_list ';'
      {
        $$ = new Object();
        $$.node_type = "decl";
        $$.type = $1;
        $$.decls = $2;
      }
    ;

declaration_specifiers
    : storage_class_specifier { $$ = [$1]; } 
    | storage_class_specifier declaration_specifiers { $$ = [$1].concat($2); }
    | type_specifier { $$ = [$1]; }
    | type_specifier declaration_specifiers { $$ = [$1].concat($2); }
    | type_qualifier { $$ = [$1]; }
    | type_qualifier declaration_specifiers { $$ = [$1].concat($2); }
    | function_specifier { $$ = [$1]; }
    | function_specifier declaration_specifiers { $$ = [$1].concat($2); }
    ;

init_declarator_list
    : init_declarator { $$ = [$1]; }
    | init_declarator_list ',' init_declarator
      {
        $1.push($3);
        $$ = $1;
      }
    ;

init_declarator
    : declarator
      {
        $$ = new Object();
        $$.name = $1;
      }
    | declarator '=' initializer
      {
        $$ = new Object();
        $$.name = $1;
        $$.value = $3;
      }
    ;

storage_class_specifier
    : TYPEDEF
    | EXTERN
    | STATIC
    | AUTO
    | REGISTER
    ;

type_specifier
    : VOID
    | CHAR
    | SHORT
    | INT
    | LONG
    | FLOAT
    | DOUBLE
    | SIGNED
    | UNSIGNED
    | _BOOL
    | _COMPLEX
    | struct_or_union_specifier
    | enum_specifier
    //| typedef_name
    ;

struct_or_union_specifier
    : struct_or_union '{' struct_declaration_list '}'
      {
        $$ = new Object();
        $$.node_type = $1;
        $$.decls = $3;
      }
    | struct_or_union IDENTIFIER '{' struct_declaration_list '}'
      {
        $$ = new Object();
        $$.node_type = $1;
        $$.name = $2;
        $$.decls = $4;
      }
    | struct_or_union IDENTIFIER
      {
        $$ = new Object();
        $$.node_type = $1;
        $$.name = $2;
      }
    ;

struct_or_union
    : STRUCT
    | UNION
    ;

struct_declaration_list
    : struct_declaration { $$ = [$1]; }
    | struct_declaration_list struct_declaration
      {
        $1.push($2);
        $$ = $1;
      }
    ;

struct_declaration
    : specifier_qualifier_list struct_declarator_list ';'
      {
        $$ = new Object();
        $$.node_type = "TODO struct_declaration";
      }
    ;

specifier_qualifier_list
    : type_specifier specifier_qualifier_list
      {
        $$ = [$1];
        $$.concat($2);
      }
    | type_specifier { $$ = [$1]; }
    | type_qualifier specifier_qualifier_list
      {
        $$ = [$1];
        $$.concat($2);
      }
    | type_qualifier { $$ = [$1]; }
    ;

struct_declarator_list
    : struct_declarator { $$ = $1; }
    | struct_declarator_list ',' struct_declarator
      {
        $1.push($3);
        $$ = $1;
      }
    ;

struct_declarator
    : declarator
    | ':' constant_expression
    {
      $$ = new Object();
      $$.node_type = "TODO struct_declarator1";
    }
    | declarator ':' constant_expression
    {
      $$ = new Object();
      $$.node_type = "TODO struct_declarator2";
    }
    ;

enum_specifier
    : ENUM '{' enumerator_list '}'
      {
        $$ = new Object();
        $$.node_type = "enum";
        $$.list = $3;
      }
    | ENUM IDENTIFIER '{' enumerator_list '}'
      {
        $$ = new Object();
        $$.node_type = "enum";
        $$.name = $2;
        $$.list = $4;
      }
    | ENUM '{' enumerator_list ',' '}'
      {
        $$ = new Object();
        $$.node_type = "enum";
        $$.list = $3;
      }
    | ENUM IDENTIFIER '{' enumerator_list ',' '}'
      {
        $$ = new Object();
        $$.node_type = "enum";
        $$.name = $2;
        $$.list = $4;
      }
    | ENUM IDENTIFIER
      {
        $$ = new Object();
        $$.node_type = "enum";
        $$.name = $2;
      }
    ;

enumerator_list
    : enumerator { $$ = [$1]; }
    | enumerator_list ',' enumerator
      {
        $1.push($3);
        $$ = $1;
      }
    ;

enumerator
    : IDENTIFIER 
      {
        $$ = new Object();
        $$.name = $1;
      }
    | IDENTIFIER '=' constant_expression
      {
        $$ = new Object();
        $$.name = $1;
        $$.data = $3;
      }
    ;

type_qualifier
    : CONST
    | RESTRICT
    | VOLATILE
    ;

function_specifier
    : INLINE
    ;

declarator
    : pointer direct_declarator
    {
      $$ = new Object();
      $$.node_type = "TODO declarator1";
      $$.data1 = $1;
      $$.data2 = $2;
    }
    | direct_declarator
    ;

direct_declarator
    : IDENTIFIER
    | '(' declarator ')'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator1";
        $$.data1 = $2;
      }
    | direct_declarator '[' ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator2";
        $$.data1 = $1;
      }
    | direct_declarator '[' type_qualifier_list ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator3";
        $$.data1 = $1;
        $$.data2 = $3;
      }
    | direct_declarator '[' assignment_expression ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator4";
        $$.data1 = $1;
        $$.data2 = $3;
      }
    | direct_declarator '[' type_qualifier_list assignment_expression ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator5";
        $$.data1 = $1;
        $$.data2 = $3;
        $$.data3 = $4;
      }
    | direct_declarator '[' STATIC assignment_expression ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator6";
        $$.data1 = $1;
        $$.data2 = $4;
      }
    | direct_declarator '[' STATIC type_qualifier_list assignment_expression ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator7";
        $$.data1 = $1;
        $$.data2 = $4;
        $$.data3 = $5;
      }
    | direct_declarator '[' type_qualifier_list STATIC assignment_expression ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator8";
        $$.data1 = $1;
        $$.data2 = $3;
        $$.data3 = $5;
      }
    | direct_declarator '[' '*' ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator9";
        $$.data1 = $1;
      }
    | direct_declarator '(' parameter_type_list ')'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator10";
        $$.data1 = $1;
        $$.data2 = $3;
      }
    | direct_declarator '(' ')'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator11";
        $$.data1 = $1;
      }
    | direct_declarator '(' identifier_list ')'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_declarator12";
        $$.data1 = $1;
        $$.data2 = $3;
      }
    ;

pointer
    : '*' { $$ = ['*']; }
    | '*' type_qualifier_list { $$ = ['*'].concat($2); }
    | '*' pointer { $$ = ['*'].concat($2); }
    | '*' type_qualifier_list pointer { $$ = ['*'].concat($2, $3); }
    ;

type_qualifier_list
    : type_qualifier { $$ = [$1]; }
    | type_qualifier_list type_qualifier
      {
        $1.push($2);
        $$ = $1;
      }
    ;

parameter_type_list
    : parameter_list
      {
        $$ = new Object();
        $$.node_type = "TODO parameter_type_list1";
        $$.data1 = $1;
      }
    | parameter_list ',' ELLIPSIS
      {
        $$ = new Object();
        $$.node_type = "TODO parameter_type_list2";
        $$.data1 = $1;
      }
    ;

parameter_list
    : parameter_declaration { $$ = [$1]; }
    | parameter_list ',' parameter_declaration
      {
        $1.push($3);
        $$ = $1;
      }
    ;

parameter_declaration
    : declaration_specifiers declarator
      {
        $$ = new Object();
        $$.node_type = "TODO parameter_declaration1";
        $$.data1 = $1;
        $$.data2 = $2;
      }
    | declaration_specifiers
      {
        $$ = new Object();
        $$.node_type = "TODO parameter_declaration2";
        $$.data1 = $1;
      }
    | declaration_specifiers abstract_declarator
      {
        $$ = new Object();
        $$.node_type = "TODO parameter_declaration3";
        $$.data1 = $1;
        $$.data2 = $2;
      }
    ;

identifier_list
    : IDENTIFIER { $$ = [$1]; }
    | identifier_list ',' IDENTIFIER
      {
        $1.push($3);
        $$ = $1;
      }
    ;

type_name
    : specifier_qualifier_list
      {
        $$ = new Object();
        $$.node_type = "TODO specifier_qualifier_list1";
        $$.data1 = $1;
      }
    | specifier_qualifier_list abstract_declarator
      {
        $$ = new Object();
        $$.node_type = "TODO specifier_qualifier_list2";
        $$.data1 = $1;
        $$.data2 = $2;
      }
    ;

abstract_declarator
    : pointer
      {
        $$ = new Object();
        $$.node_type = "TODO abstract_declarator1";
        $$.data1 = $1;
      }
    | direct_abstract_declarator
      {
        $$ = new Object();
        $$.node_type = "TODO abstract_declarator2";
        $$.data1 = $1;
      }
    | pointer direct_abstract_declarator
      {
        $$ = new Object();
        $$.node_type = "TODO abstract_declarator3";
        $$.data1 = $1;
        $$.data2 = $2;
      }
    ;

direct_abstract_declarator
    : '(' abstract_declarator ')'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_abstract_declarator1";
        $$.data1 = $2;
      }
    | '[' ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_abstract_declarator2";
      }
    | '[' constant_expression ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_abstract_declarator3";
        $$.data1 = $2;
      }
    | direct_abstract_declarator '[' ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_abstract_declarator4";
        $$.data1 = $1;
      }
    | direct_abstract_declarator '[' assignment_expression ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_abstract_declarator5";
        $$.data1 = $1;
        $$.data2 = $3;
      }
    | direct_abstract_declarator '[' '*' ']'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_abstract_declarator6";
        $$.data1 = $1;
      }
    | '(' ')'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_abstract_declarator7";
      }
    | '(' parameter_type_list ')'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_abstract_declarator8";
        $$.data1 = $2;
      }
    | direct_abstract_declarator '(' ')'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_abstract_declarator9";
        $$.data1 = $1;
      }
    | direct_abstract_declarator '(' paramter_type_list ')'
      {
        $$ = new Object();
        $$.node_type = "TODO direct_abstract_declarator10";
        $$.data1 = $1;
        $$.data2 = $3;
      }
    ;

typedef_name
    : IDENTIFIER
    ;

initializer
    : assignment_expression
    | '{' initializer_list '}'
      {
        $$ = new Object();
        $$.node_type = "TODO initializer2";
        $$.data1 = $2;
      }
    | '{' initializer_list ',' '}'
      {
        $$ = new Object();
        $$.node_type = "TODO initializer3";
        $$.data1 = $2;
      }
    ;

initializer_list
    : initializer
      {
        $$ = new Object();
        $$.node_type = "TODO initializer_list1";
        $$.data1 = $1;
      }
    | designation initializer
      {
        $$ = new Object();
        $$.node_type = "TODO initializer_list2";
        $$.data1 = $1;
        $$.data2 = $2;
      }
    | initializer_list ',' initializer
      {
        $$ = new Object();
        $$.node_type = "TODO initializer_list3";
        $$.data1 = $1;
        $$.data2 = $3;
      }
    | initializer_list ',' designation initializer
      {
        $$ = new Object();
        $$.node_type = "TODO initializer_list4";
        $$.data1 = $1;
        $$.data2 = $3;
        $$.data3 = $4;
      }
    ;

designation
    : designator_list '='
      {
        $$ = new Object();
        $$.node_type = "TODO designation";
        $$.data1 = $1;
      }
    ;

designator_list
    : designator { $$ = $1; }
    | designator-list designator
      {
        $1.push($2);
        $$ = $1;
      }
    ;

designator
    : '[' constant_expression ']'
      {
        $$ = new Object();
        $$.node_type = "TODO designator1";
        $$.data1 = $2;
      }
    | '.' IDENTIFIER
      {
        $$ = new Object();
        $$.node_type = "TODO designator2";
        $$.data2 = $2;
      }
    ;

/* A.2.3 Statements */

statement
    : labeled_statement
    | compound_statement
    | expression_statement
    | selection_statement
    | iteration_statement
    | jump_statement
    ;

labeled_statement
    : IDENTIFIER ':' statement
      {
        $$ = new Object();
        $$.node_type = "labeled_statement";
        $$.label = $1;
        $$.statement = $3;
      }
    | CASE constant_expression ':' statement
      {
        $$ = new Object();
        $$.node_type = "case";
        $$.guard = $2;
        $$.body = $4;
      }
    | DEFAULT ':' statement
    ;

compound_statement
    : '{' '}'
      {
        $$ = new Object();
        $$.node_type = "block";
      }
    | '{' block_item_list '}'
      {
        $$ = new Object();
        $$.node_type = "block";
        $$.contents = $2;
      }
    ;

block_item_list
    : block_item { $$ = [$1]; }
    | block_item_list block_item
      {
        $1.push($2);
        $$ = $1;
      }
    ;

block_item
    : declaration
    | statement
    ;

expression_statement
    : ';' { $$ = []; }
    | expression ';' 
    ;

statement_list
    : statement { $$ = [$1]; }
    | statement_list statement
      {
        $1.push($2);
        $$ = $1;
      }
    ;

selection_statement
    : IF '(' expression ')' statement
      {
        $$ = new Object();
        $$.node_type = "if";
        $$.cond = $3;
        $$.then = $5;
      }
    | IF '(' expression ')' statement ELSE statement
      {
        $$ = new Object();
        $$.node_type = "if";
        $$.cond = $3;
        $$.then = $5;
        $$.else = $7;
      }
    | SWITCH '(' expression ')' statement
      {
        $$ = new Object();
        $$.node_type = "switch";
        $$.param = $3;
        $$.body = $5;
      }
    ;

iteration_statement
    : WHILE '(' expression ')' statement
      {
        $$ = new Object();
        $$.node_type = "while";
        $$.cond = $3;
        $$.body = $5;
      }
    | DO statement WHILE '(' expression ')' ';'
      {
        $$ = new Object();
        $$.node_type = "do_while";
        $$.cond = $5;
        $$.body = $2;
      }
    | FOR '(' expression_statement expression_statement ')' statement
      {
        $$ = new Object();
        $$.node_type = "for";
        $$.init = $3;
        $$.cond = $4;
        $$.body = $6;
      } 
    | FOR '(' expression_statement expression_statement expression ')' statement
      {
        $$ = new Object();
        $$.node_type = "for";
        $$.init = $3;
        $$.cond = $4;
        $$.action = $5;
        $$.body = $7;
      } 
    | FOR '(' declaration expression_statement ')' statement
      {
        $$ = new Object();
        $$.node_type = "for";
        $$.init = $3;
        $$.cont = $4;
        $$.body = $6;
      }
    | FOR '(' declaration expression_statement expression')' statement
      {
        $$ = new Object();
        $$.node_type = "for";
        $$.init = $3;
        $$.cond = $4;
        $$.action = $5;
        $$.body = $7;
      }
    ;

jump_statement
    : GOTO IDENTIFIER
      {
        $$ = new Object();
        $$.node_type = "goto";
        $$.target = $2;
      }
    | CONTINUE ';'
    | BREAK ';'
    | RETURN ';'
      {
        $$ = new Object();
        $$.node_type = "return";
      }
    | RETURN expression ';'
      {
        $$ = new Object();
        $$.node_type = "return";
        $$.target = $2;
      }
    ;

/* A.2.4 External definitions */

translation_unit
    : external_declaration { $$ = [$1]; }
    | translation_unit external_declaration
      {
        $1.push($2);
        $$ = $1;
      }
    ;

external_declaration
    : function_definition 
    | declaration
    ;

function_definition
    : declaration_specifiers declarator compound_statement
      { 
        $$ = new Object();
        $$.node_type = "function_definition"
        $$.return_type = $1;
        $$.sig = $2;
        $$.body = $3;
      }
    | declaration_specifiers declarator declaration_list compound_statement
      { 
        $$ = new Object();
        $$.node_type = "TODO function_definition";
        $$.return_type = $1;
        $$.sig = $2;
        $$.body = $4;
        $$.data1 = $3;
      }
    ;

declaration_list
    : declaration { $$ = [$1]; }
    | declaration_list declaration
      {
        $1.push($2);
        $$ = $1;
      }
    ;

start
    : translation_unit EOF { return $$ = $1; }
    ;
