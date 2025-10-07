grammar Sheet;

sheet: (lb | table_definition | python_definition)* EOF;
formula: expression EOF;

/* * Parser Rules */
number: '-'? FLOAT;
string: STRING_LITERAL;
bool: 'TRUE' | 'FALSE';
na: 'NA';
query_row: '$';
uni_op: 'NOT' | '-';
bin_pow: '^';
bin_mul_div_mod: '*' | '/' | 'MOD';
bin_add_sub: '+' | '-';
bin_concat: '&';
bin_compare: '<' | '>' | '=' | '<=' | '>=' | '<>';
bin_and: 'AND';
bin_or: 'OR';
primitive: number | string;
function_name: IDENTIFIER;
table_name: IDENTIFIER | MULTI_WORD_TABLE_IDENTIFIER;
field_name: FIELD_NAME;
fields_reference: '[' field_name (',' field_name)+ ']';
decorator_name: IDENTIFIER;
lb: LINE_BREAK+;
doc_comment: DOC_COMMENT lb;
list_expression: '{' (expression (',' expression)*)? '}';
row_ref: MULTI_WORD_TABLE_IDENTIFIER '(' (expression (',' expression)*)? ')';
decorator_definition: lb? '!' lb? decorator_name lb? '(' lb? (primitive (lb? ',' lb? primitive lb?)*)? lb? ')' lb?;
field_declaration: doc_comment* decorator_definition* (KEY_KEYWORD DIMENSION_KEYWORD? | DIMENSION_KEYWORD KEY_KEYWORD?)? field_name;
fields_definition: field_declaration (lb? ',' lb? field_declaration)* ('=' expression)?;
override_field: (KEY_KEYWORD? field_name) | ROW_KEYWORD;
override_fields: override_field (',' override_field)* LINE_BREAK;
override_value: expression?;
override_row: override_value (',' override_value)*;
override_definition: OVERRIDE_KEYWORD lb override_fields (override_row LINE_BREAK)*?;
table_definition: doc_comment* decorator_definition* TABLE_KEYWORD lb? table_name lb?
                  (fields_definition lb)* (apply_definition | total_definition)* override_definition?;
python_definition: PYTHON_BLOCK;

apply_definition: 'apply' lb (apply_filter? apply_sort? | apply_sort? apply_filter?);
apply_filter: 'filter' expression lb;
apply_sort: 'sort' expression (',' expression)* lb;

total_definition: 'total' lb (fields_definition lb)*;
function_argument: expression?;

expression: number
         | string
         | bool
         | na
         | query_row
         | function_name '(' ')'
         | function_name '(' function_argument (',' function_argument)* ')'
         | expression '.' function_name '(' ')'
         | expression '.' function_name '(' function_argument (',' function_argument)* ')'
         | table_name
         | field_name
         | expression field_name
         | expression fields_reference
         | row_ref
         | '(' expression ')'
         | uni_op expression
         | expression bin_pow expression
         | expression bin_mul_div_mod expression
         | expression bin_add_sub expression
         | expression bin_concat expression
         | expression bin_compare expression
         | expression bin_and expression
         | expression bin_or expression
         | list_expression
         ;

/* * Lexer Rules */
fragment DIGIT: [0-9];
OVERRIDE_KEYWORD: 'override';
ROW_KEYWORD: 'row';
TABLE_KEYWORD: 'table';
DIMENSION_KEYWORD: 'dim';
KEY_KEYWORD: 'key';
FLOAT: DIGIT+ ('.' DIGIT+)? ([eE] [+-]? DIGIT+)?;
IDENTIFIER: [a-zA-Z0-9_]+;
STRING_LITERAL: '"' (('\'\'' | '\'"') | ~('\n' | '\r' | '"' | '\''))*? '"';
FIELD_NAME: '[' (('\'\'' | '\'[' | '\']') | ~('\n' | '\r' | '[' | ']' | '\''))* ']';
PYTHON_BLOCK: '```python' .+? '```';
MULTI_WORD_TABLE_IDENTIFIER: '\'' (('\'\'') | ~('\n' | '\r' | '\''))* '\'';
LINE_BREAK: '\r\n' | '\n' | '\r';
DOC_COMMENT: '##' ~[\r\n]*;
COMMENT: '#' ~[\r\n]* -> channel(HIDDEN);
WS: ( ' ' | '\t' | ';' | ('\\' LINE_BREAK))+ -> skip;
