# QuantGrid Usage

QuantGrid is command-line interface created to define computational pipelines of tabular data.
QuantGrid was created specifically for dealing with big data tables, QuantGrid is capable of processing huge tables.

User workspace consists of tables.
Every table consists of fields.
Every field is described by special syntax "formula". This formula defines how field *values* are computed.

# QuantGrid Table Computation

Every QuantGrid table consists of several fields.
Field is defined only by its formula. Formula defines how to compute field *values* on computation phase.
After QuantGrid workspace is compiled, QuantGrid computes every table contents.

Every table field values are dynamic and depend on field formula.
All table fields contain the same number of values. Aligned tuples of values across table fields are called "rows".

## Field Values Computation

Before QuantGrid computes table content, all table fields are empty. Table content are computed field-by-field.

First field formula are calculated one time. If field type is "unnested" (and formula returns array), then returned
array is unnested into field values. If field type is not "unnested", then returned value is stored as single value of
field.

Then, QuantGrid computes second field values. Second field formula is applied as many times as there are rows in the
table at the moment. If first field was not "unnested", then second field formula will be computed only one time. If
first field was "unnested", then second field formula will be computed as many times as there values in first field.

Such algorithm applies to all subsequent fields. Field formula is computed as many times as there are already rows in
the table. "unnested" field forms the "skeleton" of the table, because they define both field data and table row count.
Any field may be "unnested".

## Fields

Therefore, every table may contain fields of the following two types:

1. "Unnested" field. Such field works as "UNNEST SQL operation + Cartesian Product". "Unnested" field formula must
   return array, because returned array will be unnested into field values. In logic terms, "unnested" field defines
   the "for" loop for all subsequent field formulas and can be treated as "for every already computed table row,
   calculate field formula, and unnest its results into new table rows".
2. Non-"unnested" (regular) field. Non-"unnested" fields defines only field values. Their formulas should be treated
   as "For every already existing table row, calculate this formula, and unnest its results into new table rows".

### Fields Computation Conceptual Diagram

```ascii
Table Computation Process
=========================

Field 1       Field 2       Field 3       Field 4
(Unnested)    (Regular)     (Unnested)    (Regular)
    |             |             |             |
    v             v             v             v
+---------+    +--------+    +-------+    +--------+
| [a,b,c] |    | f(row) |    | [1,2] |    | g(row) |
+---------+    +--------+    +-------+    +--------+
    |             |             |             |
    |             |             |             |
    v             v             v             v

Computation Steps:
------------------

1. Field 1 (Unnested):  [a, b, c]
   
2. Field 2 (Regular):   f(a) -> x
                        f(b) -> x
                        f(c) -> x

3. Field 3 (Unnested):  [1, 2] for each row
   
4. Field 4 (Regular):   g(a, x, 1) -> p
                        g(a, x, 2) -> p
                        g(b, x, 1) -> q
                        g(b, x, 2) -> q
                        g(c, x, 1) -> r
                        g(c, x, 2) -> r

Resulting Table:
----------------

Field 1    Field 2    Field 3    Field 4
-------    -------    -------    -------
   a          x          1          p
   a          x          2          p
   b          x          1          q
   b          x          2          q
   c          x          1          r
   c          x          2          r

Legend:
-------
f(row): Formula for Field 2, computed for each row
g(row): Formula for Field 4, computed for each row
```

## Field Value Primitive Types

Quantgrid field values may be of the following primitive types:

1. `number`. Only `number` type supports arithmetic operators: `+`, `-`, `/`, `*`, `^`, `%`. All QuantGrid `number`
   operations are exception-safe and no explicit safe checks should be performed.
2. `boolean`. Only `boolean` type supports logical operators: `and` (`a and b`), `or` (`a or b`), `not` (`not a`).
3. `string`. String literals must be enclosed by double quotes: "Example String Literal".
4. `date`. Date contains year, month and day. `date` type support addition and subtraction with `number` - in
   such case, `number` is treated as "days count".

If some function accepts any primitive type, it will be listed as `primitive`.
To cast between different primitive types, special functions must be used.

All *primitive* types supports comparison operators: `<`, `<=`, `>`, `>=`, `!=`, `==`. For `numbers` and `boolean`,
arithmetic comparison is used. For `strings`, lexicographic comparison is used. For `dates`, date comparison is used.

## `row_ref<table>` Row Reference Type

`row_ref<table>` is a reference to one row of a table. Referenced table name is denoted inside angle brackets.
`row_ref` type supports indexing by field name. To get `row_ref` element by field name, use dot
operator: `ref_variable.field`.
`row_ref` fields are convenient to store references to other table row and later unpack `rof_ref` into separate row
fields.

### `row_ref<table>` Conceptual Diagram

```ascii
Table A                 Table B
--------                --------
id | name               id | value | ref_to_A
---+-----               ---+-------+---------
1  | Alice              10 |  100  | row_ref<A>
2  | Bob                20 |  200  | row_ref<A>
3  | Charlie            30 |  300  | row_ref<A>

                            |
                            v

Row Reference Usage
-------------------

When parametrized by ref_to_A: ref_to_A -> row_ref<A>
                                         |
                                         | (dot operator)
                                         v
                                +----------------+
                                |                |
                                v                v
                           ref_to_A.id      ref_to_A.name

Example Computation:
--------------------

For each row in Table B:
  value = compute_function(ref_to_A.name, value)

Result:
-------

Table B (after computation)
---------------------------
id | value |    ref_to_A
---+-------+---------------
10 |  100  | row_ref<A> (1)
20 |  200  | row_ref<A> (2)
30 |  300  | row_ref<A> (3)

Expanded view of Table B
------------------------
id | value |  ref_to_A.id | ref_to_A.name
---+-------+--------------+--------------
10 |  100  |       1      |    Alice
20 |  200  |       2      |    Bob
30 |  300  |       3      |    Charlie

Unnested Field Initialization with Table Reference
-----------------------------------------------------

Table C
+----------------+-----------------+
|    ref_to_B    | computed_value  |
+----------------+-----------------+
| row_ref<B> (1) | f(ref_to_B)     |
| row_ref<B> (2) | f(ref_to_B)     |
| row_ref<B> (3) | f(ref_to_B)     |
+----------------+-----------------+

Formula: 
ref_to_B: row_ref<B> = B  # Unnested field initialized with table reference
computed_value: number = ref_to_B.value * 2
```

## `array<T>` Array Type

`array<T>` is a homogeneous array. Parametrized type is denoted inside angle brackets.
Array may be parametrized by any type, including `row_ref` type: `array<row_ref<table>>`.

1. Any table may be referenced inside formula by using required table name. Table reference returns `array<table>`.
2. Explicit array may be created in formula using curly braces: `{1, 2, 3, 4, 5}`.
3. For arrays parametrized by rows, dot operator may be used to slice an array of some field values inside rows. For
   example, `array_variable.field_name`.
4. To reference whole array of field values, table name must be prefixed: `table_name.field_name`.

```ascii
1. Basic array<T>
-----------------
array<number> = {1, 2, 3, 4, 5}
    |
    v
+---+---+---+---+---+
| 1 | 2 | 3 | 4 | 5 |
+---+---+---+---+---+

2. Array from table reference
-----------------------------
Table A
+----+------+
| id | name |
+----+------+
| 1  | Alice|
| 2  | Bob  |
| 3  | Carol|
+----+------+
    |
    | (Table reference returns array<row_ref<A>>)
    v
+-------------------+
| array<row_ref<A>> |
+-------------------+
        |
        | (Can be used directly or unnested)
        v

3. Unnested field initialization with table reference
----------------------------------------------------
Table B
+----------------+--------------+
|    ref_to_A    | computed_val |
+----------------+--------------+
| row_ref<A> (1) | f(ref_to_A)  |
| row_ref<A> (2) | f(ref_to_A)  |
| row_ref<A> (3) | f(ref_to_A)  |
+----------------+--------------+

Formula:
ref_to_A: row_ref<A> = A  # Unnested field initialized with table reference
computed_val: number = ref_to_A.id * 2

4. Array slicing with dot operator
----------------------------------
array<row_ref<A>>.name
    |
    v
+-------+-----+-------+
| Alice | Bob | Carol |
+-------+-----+-------+

5. Referencing whole array of field values
------------------------------------------
A.name
  |
  v
+-------+-----+-------+
| Alice | Bob | Carol |
+-------+-----+-------+

Key Points:
-----------
1. array<T> is a homogeneous array of type T
2. Can be created explicitly: {1, 2, 3, 4, 5}
3. Table references return array<row_ref<Table>>
4. Unnested fields can be initialized with table references
5. Dot operator can be used for array slicing
6. Table_name.field_name references whole array of field values
```

## Variables

All variables in formulas (including table names and field names) can be referenced using plain name. However, if
variable contain non-alphanumeric characters, it must be surrounded by single quotes.

Examples:

```
simple_name
'Complex Name'
Table1.'Field with spaces'
'Table with spaces'.'Field name'
```