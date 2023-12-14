grammar Sheet;

/* * Parser Rules */
number: FLOAT;
string: STRING_LITERAL;
primitive: number | string;
function_name: UPPER_CASE_IDENTIFIER;
table_name: IDENTIFIER | UPPER_CASE_IDENTIFIER | LOWER_CASE_IDENTIFIER | MULTI_WORD_TABLE_IDENTIFIER;
field_name: FIELD_NAME;
decorator_name: LOWER_CASE_IDENTIFIER;
bin_add_sub: '+' | '-';
bin_mul_div_mod: '*' | '/' | 'MOD';
bin_pow: '^';
bin_and: 'AND';
bin_or: 'OR';
bin_compare: '<' | '>' | '==' | '<=' | '>=' | '<>';
uni_op: 'NOT' | '-';
query_row: '$';
na_expression: 'NA';
decorator_definition: '!' decorator_name '(' (primitive (',' primitive)*) ? ')';
field_definition: decorator_definition* KEY_KEYWORD?  DIMENSION_KEYWORD? field_name '=' expression;
override_definition: OVERRIDE_CONTENT;
table_definition: decorator_definition* TABLE_KEYWORD table_name field_definition* override_definition?;

expression: number
         | string
         | function_name '(' (expression (',' expression)*)? ')'
         | expression '.' function_name '(' (expression (',' expression)*)? ')'
         | expression field_name
         | table_name
         | '(' expression ')'
         | <assoc=right> expression bin_pow expression
         | uni_op expression
         | expression bin_mul_div_mod expression
         | expression bin_add_sub expression
         | expression bin_compare expression
         | expression bin_and expression
         | expression bin_or expression
         | field_name
         | query_row
         | na_expression
         ;

sheet: table_definition* EOF;
formula: expression EOF;

/* * Lexer Rules */
fragment DIGIT: [0-9];
TABLE_KEYWORD: 'table';
DIMENSION_KEYWORD: 'dim';
KEY_KEYWORD: 'key';
FLOAT: DIGIT+ ('.' DIGIT+)?;
UPPER_CASE_IDENTIFIER: [A-Z0-9]+;
LOWER_CASE_IDENTIFIER: [a-z0-9]+;
IDENTIFIER: [a-zA-Z0-9_]+;
STRING_LITERAL: '"' (~('\n' | '"' | '{' | '}'))*? '"';
FIELD_NAME: '[' (~('\n' | '"' | '{' | '}' | '[' | ']'))+ ']';
MULTI_WORD_TABLE_IDENTIFIER: '\'' .*? '\'';
OVERRIDE_CONTENT: 'override' ('\n' | '\r\n') .*? (('\n' (' ' | '\t' | '\r')*? ('\n' | '\r\n')) | EOF);
COMMENT: '#' ~[\r\n]*;
WS: ( ' ' | '\t' | '\r' | '\n' | ';' | COMMENT)+ -> skip;