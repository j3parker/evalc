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
"int"                 return 'INT'
"long"                return 'LONG'
"register"            return 'REGISTER'
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
        $$.target.node_type = "+"
        $$.target.targets = [$1, $3];
      }
    | postfix_expression '(' ')'
      {
        $$ = new Object();
        $$.node_type = "function_call";
        $$.func = $1;
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

struct_or_union_specifier
    : struct_or_union IDENTIFIER '{' struct_declaration_list '}'
      {
        $$ = new Object();
        $$.node_type = $1;
        $$.name = $2;
        $$.decls = $4;
      }
    | struct_or_union '{' struct_declaration_list '}'
      {
        $$ = new Object();
        $$.node_type = $1;
        $$.decls = $3;
      }
    | struct_or_union IDENTIFIER
      {
        $$ = new Object();
        $$.node_type = $1;
        $$.name = $2;
      }
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
    : specifier_qualifier_list struct_declarator_list ';' /* TODO */
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
    | ':' constant_expression /* TODO */
    | declarator ':' constant_expression /* TODO */
    ;

constant_expression
    : conditional_expression
    ;

declarator
    : pointer direct_declarator /* TODO */
    | direct_declarator
    ;

direct_declarator /* TODO */
    : IDENTIFIER
    | '(' declarator ')'
    | direct_declarator '[' constant_expression ']'
    | direct_declarator '[' ']'
    | direct_declarator '(' parameter_type_list ')'
    | direct_declarator '(' identifier_list ')'
    | direct_declarator '(' ')'
    ;

identifier_list
    : IDENTIFIER { $$ = [$1]; }
    | identifier_list ',' IDENTIFIER
      {
        $1.push($3);
        $$ = $1;
      }
    ;

parameter_type_list /* TODO */
    : parameter_list
    | parameter_list ',' ELLIPSIS
    ;

parameter_list
    : parameter_declaration { $$ = [$1]; }
    | parameter_list ',' parameter_declaration
      {
        $1.push($3);
        $$ = $1;
      }
    ;

parameter_declaration /* TODO */
    : declaration_specifiers declarator
    | declaration_specifiers abstract_declarator
    | declaration_specifiers
    ;

declaration_specifiers
    : storage_class_specifier
    | storage_class_specifier declaration_specifiers /* TODO */
    | type_specifier
    | type_specifier declaration_specifiers /* TODO */
    | type_qualifier
    | type_qualifier declaration_specifier /* TODO */
    ;

storage_class_specifier
    : TYPEDEF
    | EXTERN
    | STATIC
    | AUTO
    | REGISTER
    ;

type_qualifier
    : CONST
    | VOLATILE
    ;

struct_or_union
    : STRUCT
    | UNION
    ;

enumerator
    : IDENTIFIER /* TODO */
    | IDENTIFIER '=' constant_expression
    ;

enumerator_list
    : enumerator { $$ = [$1]; }
    | enumerator_list ',' enumerator
      {
        $1.push($3);
        $$ = $1;
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
    | ENUM IDENTIFIER
      {
        $$ = new Object();
        $$.node_type = "enum";
        $$.name = $2;
      }
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
    | struct_or_union_specifier
    | enum_specifier
    ;

specifier_qualifier_list
    : type_specifier specifier_qualifier_list /* TODO */
    | type_specifier
    | type_qualifier specifier_qualifier_list /* TODO */
    | type_qualifier
    ;

type_name /* TODO */
    : specifier_qualifier_list
    | specifier_qualifier_list abstract_declarator
    ;

abstract_declarator /* TODO */
    : pointer
    | direct_abstract_declarator
    | pointer direct_abstract_declarator
    ;

direct_abstract_declarator /* TODO */
    : '(' abstract_declarator ')'
    | '[' ']'
    | '[' constant_expression ']'
    | direct_abstract_declarator '[' ']'
    | direct_abstract_declarator '[' constant_expression ']'
    | '(' ')'
    | '(' parameter_type_list ')'
    | direct_abstract_declarator '(' ')'
    | direct_abstract_declarator '(' paramter_type_list ')'
    ;

pointer /* TODO */
    : '*'
    | '*' type_qualifier_list
    | '*' pointer
    | '*' type_qualifier_list pointer
    ;

type_qualifier_list
    : type_qualifier { $$ = [$1]; }
    | type_qualifier_list type_qualifier
      {
        $1.push($2);
        $$ = $1;
      }
    ;

expression_statement
    : ';' { $$ = []; }
    | expression ';' 
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

initializer_list
    : initializer { $$ = [$1]; }
    | intializer_list ',' initializer
      {
        $1.push($3);
        $$ = $1;
      }
    ;


initializer /* TODO */
    : assignment_expression
    | '{' initializer_list '}'
    | '{' initializer_list ',' '}'
    ;

init_declarator
    : declarator
    | declarator '=' initializer /* TODO */
    ;

init_declarator_list
    : init_declarator { $$ = [$1]; }
    | init_declarator_list ',' init_declarator
      {
        $1.push($3);
        $$ = $1;
      }
    ;

declaration
    : declaration_specifiers ';'
    | declaration_specifiers init_declarator_list ';' /* TODO */
    ;

declaration_list
    : declaration { $$ = [$1]; }
    | declaration_list declaration
      {
        $1.push($2);
        $$ = $1;
      }
    ;

compound_statement
    : '{' '}'
      {
        $$ = new Object();
        $$.node_type = "block";
      }
    | '{' statement_list '}'
      {
        $$ = new Object();
        $$.node_type = "block";
        $$.statements = $2;
      }
    | '{' declaration_list '}'
      {
        $$ = new Object();
        $$.node_type = "block";
        $$.decls = $2;
      }
    | '{' declaration_list statement_list '}'
      {
        $$ = new Object();
        $$.node_type = "block";
        $$.decls = $2;
        $$.statements = $3;
      }

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

statement
    : labeled_statement
    | compound_statement
    | expression_statement
    | selection_statement
    | iteration_statement
    | jump_statement

    ;

function_definition
    : declaration_specifiers declarator declaration_list compound_statement  
    | declaration_specifiers declarator compound_statement
    { 
      $$ = new Object();
      $$.node_type = "function_definition"
      $$.return_type = $1;
      $$.sig = $2;
      $$.body = $3;
    }
    | declarator declaration_list compound_statement
    | declarator compound_statement 
    ;

external_declaration
    : function_definition 
    | declaration
    ;

translation_unit
    : external_declaration { $$ = [$1]; }
    | translation_unit external_declaration
      {
        $1.push($2);
        $$ = $1;
      }
    ;

start
    : translation_unit EOF { return $$ = $1; }
    ;

