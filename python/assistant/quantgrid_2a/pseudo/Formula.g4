grammar Formula;

number: FLOAT;
string: STRING;
na: 'NA';

bin_add_sub: '+' | '-';
bin_mul_div_mod: '*' | '/' | '%';
bin_pow: '^';
bin_and: 'and';
bin_or: 'or';


bin_compare: '<' | '>' | '==' | '<=' | '>=' | '!=';
uni_op: 'not' | '-';

function_name: IDENTIFIER;
variable_name: IDENTIFIER | QUOTED_IDENTIFIER;

type: (IDENTIFIER | QUOTED_IDENTIFIER) ('<' type (',' type)* '>')?;
parameter: (IDENTIFIER | QUOTED_IDENTIFIER) (':' type)?;

input: formula EOF;

formula: number
       # on_number
       | string
       # on_string
       | na
       # on_na
       | '(' (parameter (',' parameter)*)? ')' LAMBDA_ARROW '{' formula '}'
       # on_lambda
       | function_name '(' (formula (',' formula)*)? ')'
       # on_global_function
       | formula '.' function_name '(' (formula (',' formula)*)? ')'
       # on_member_function
       | formula '.' (IDENTIFIER | QUOTED_IDENTIFIER | FLOAT)
       # on_indexing
       | '(' formula ')'
       # on_parentheses
       | <assoc = right> formula bin_pow formula
       # on_pow
       | uni_op formula
       # on_unary
       | formula bin_mul_div_mod formula
       # on_mul_div_mod
       | formula bin_add_sub formula
       # on_add_sub
       | formula bin_compare formula
       # on_compare
       | formula bin_and formula
       # on_and
       | formula bin_or formula
       # on_or
       | '{' (formula (',' formula)*)? '}'
       # on_list
       | variable_name
       # on_variable
       ;

fragment DIGIT: [0-9];
FLOAT: ('-')? DIGIT+ ('.' DIGIT+)?;
IDENTIFIER: [a-zA-Z0-9_]+;
QUOTED_IDENTIFIER: '\'' (~('\n' | '\r' | '\''))* '\'';
STRING: '"' (~('\n' | '\r' | '"'))*? '"';
LAMBDA_ARROW: '=>';
WS: (' ' | '\t' | '\n' | '\r\n')+ -> channel(HIDDEN);
