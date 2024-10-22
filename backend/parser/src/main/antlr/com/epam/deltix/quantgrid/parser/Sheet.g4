grammar Sheet;

sheet: (lb | table_definition | python_definition)* EOF;
formula: expression EOF;

/* * Parser Rules */
number: FLOAT;
string: STRING_LITERAL;
primitive: number | string;
function_name: IDENTIFIER;
table_name: IDENTIFIER | MULTI_WORD_TABLE_IDENTIFIER;
field_name: FIELD_NAME;
decorator_name: IDENTIFIER;
bin_add_sub: '+' | '-';
bin_mul_div_mod: '*' | '/' | 'MOD';
bin_pow: '^';
bin_and: 'AND';
bin_or: 'OR';
bin_compare: '<' | '>' | '=' | '<=' | '>=' | '<>';
bin_concat: '&';
uni_op: 'NOT' | '-';
query_row: '$';
na_expression: 'NA';
lb: LINE_BREAK+;
doc_comment: DOC_COMMENT lb;
list_expression: '{' (expression (',' expression)*)? '}';
row_ref: MULTI_WORD_TABLE_IDENTIFIER '(' (expression (',' expression)*)? ')';
decorator_definition: lb? '!' lb? decorator_name lb? '(' lb? (primitive (lb? ',' lb? primitive lb?)*)? lb? ')' lb?;
field_definition: doc_comment* decorator_definition*  (KEY_KEYWORD? DIMENSION_KEYWORD? | DIMENSION_KEYWORD? KEY_KEYWORD?) field_name ('=' expression)?;
override_field: (KEY_KEYWORD? field_name) | ROW_KEYWORD;
override_fields: override_field (',' override_field)* LINE_BREAK;
override_value: expression?;
override_row: override_value (',' override_value)*;
override_definition: OVERRIDE_KEYWORD lb override_fields (override_row LINE_BREAK)*?;
table_definition: doc_comment* decorator_definition* TABLE_KEYWORD lb? table_name lb?
                  (field_definition lb)* ((apply_definition | total_definition) lb?)* override_definition?;
python_definition: PYTHON_BLOCK;

apply_definition: 'apply' lb (apply_filter? apply_sort? | apply_sort? apply_filter?);
apply_filter: 'filter' expression lb;
apply_sort: 'sort' expression (',' expression)* lb;

total_definition: 'total' lb (field_definition lb)*;

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
         | expression bin_concat expression
         | field_name
         | query_row
         | row_ref
         | na_expression
         | list_expression
         ;

/* * Lexer Rules */
fragment DIGIT: [0-9];
OVERRIDE_KEYWORD: 'override';
ROW_KEYWORD: 'row';
TABLE_KEYWORD: 'table';
DIMENSION_KEYWORD: 'dim';
KEY_KEYWORD: 'key';
FLOAT: ('-')? DIGIT+ ('.' DIGIT+)?;
IDENTIFIER: [a-zA-Z0-9_]+;
STRING_LITERAL: '"' (('\'\'' | '\'"') | ~('\n' | '\r' | '"' | '\''))*? '"';
FIELD_NAME: '[' (('\'\'' | '\'[' | '\']') | ~('\n' | '\r' | '[' | ']' | '\''))* ']';
PYTHON_BLOCK: '```python' .+? '```';
MULTI_WORD_TABLE_IDENTIFIER: '\'' (('\'\'') | ~('\n' | '\r' | '\''))* '\'';
LINE_BREAK: '\r\n' | '\n' | '\r';
DOC_COMMENT: '##' ~[\r\n]*;
COMMENT: '#' ~[\r\n]* -> channel(HIDDEN);
WS: ( ' ' | '\t' | ';' | ('\\' LINE_BREAK))+ -> skip;
