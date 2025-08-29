grammar Formula;

formula: expression EOF;

/* * Parser Rules */
number: FLOAT;
string: STRING_LITERAL;
function_name: IDENTIFIER;
table_name: IDENTIFIER | MULTI_WORD_TABLE_IDENTIFIER;
field_name: FIELD_NAME;
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

expression: number
            # exprNumber
         | string
         # exprString
         | function_name '(' (expression (',' expression)*)? ')'
         # exprGlobalFunction
         | expression '.' function_name '(' (expression (',' expression)*)? ')'
         # exprMemberFunction
         | table_name field_name
         # exprTableFieldSlice
         | expression field_name
         # exprGenericFieldSlice
         | table_name
         # exprTableName
         | '(' expression ')'
         # exprParenthesis
         | <assoc=right> expression bin_pow expression
         # exprPow
         | uni_op expression
         # exprUnaryOperator
         | expression bin_mul_div_mod expression
         # exprMulDivMod
         | expression bin_add_sub expression
         # exprAddSub
         | expression bin_compare expression
         # exprCompare
         | expression bin_and expression
         # exprAnd
         | expression bin_or expression
         # exprOr
         | expression bin_concat expression
         # exprConcat
         | field_name
         # exprFieldReference
         | query_row
         # exprDollar
         | na_expression
         # exprNa
         | '{' (expression (',' expression)*)? '}'
         # exprList
         ;

/* * Lexer Rules */
fragment DIGIT: [0-9];
FLOAT: ('-')? DIGIT+ ('.' DIGIT+)?;
IDENTIFIER: [a-zA-Z0-9_]+;
STRING_LITERAL: '"' (('\'\'' | '\'"') | ~('\n' | '\r' | '"' | '\''))*? '"';
FIELD_NAME: '[' (('\'\'' | '\'[' | '\']') | ~('\n' | '\r' | '[' | ']' | '\''))* ']';
MULTI_WORD_TABLE_IDENTIFIER: '\'' (('\'\'') | ~('\n' | '\r' | '\''))* '\'';
LINE_BREAK: '\r\n' | '\n' | '\r';
WS: ( ' ' | '\t' | ';' | ('\\' LINE_BREAK))+ -> skip;
