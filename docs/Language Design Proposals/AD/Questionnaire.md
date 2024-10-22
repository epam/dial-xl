
# Questionnaire

1. Is single cell with data/formula different from the one-cell-table?

    It's a one-cell-table (assuming **only-tables-on-top-level** approach)

2. When user enters data/formula into cell next to (right or bottom) another cell, is it two cells or two-cell-table?

    It's a two-cell-table (following the same **only-tables-on-top-level** approach)

3. Can range of cells be referenced?

    a. Ranges are supported inside a table via slicing syntax like `Table1[1:3]{2:4}`
    b. Ranges aren't supported on the sheet table level (like `Sheet1[1:3]{2:4}`)

4. Is vertical table acts any different to horizontal one (See write DSL examples 1 and 2)?

    Yes. Vertical table is addressed in a different way than horizontal.
    [] syntax for vanilla vertical tables to address column(s)/field(s).
    {} syntax for horizontal tables to address row(s).
    Mixed syntax for tables having keys in both directions.

5. User entered data/formula in the middle of the sheet. No names assigned. How to address it?

    No-name table with appropriate dimensions is automatically created. Reference it via standard table referencing syntax:

    `ScalarTable` returns a scalar value. BUT it may be used in the contexts where a table is expected.
    So strictly speaking, `ScalarTable` has 4 different **views**: a table, a row, a column and a scalar.

6. User entered column of data points/formulas in the middle of the sheet. No names assigned. How do you address the column?

    No-name table with appropriate dimensions is automatically created. Reference it via standard table referencing syntax:

    `ColumnTable` return a column vector.

7. How do you address specific cell inside such column?

    `ColumnTable{row_number}` returns a scalar *(or whatever type of a cell is)* value in the column.

8. User entered row of data points/formulas in the middle of the sheet. No names assigned. How do you address the row?

    No-name table with appropriate dimensions is automatically created. Reference it via standard table referencing syntax:

    `RowTable` returns a row vector.

9. How do you address specific cell inside such row?

    `RowTable[col_number]` returns a scalar *(or whatever type of a cell is)* value in the row.

10. How to address row of the table? (If there are multiple options depending on the table type, give all of them)

    If the column key (aka row names) isn't defined, then `Table{row_number}`.
    Otherwise,
      a. `Table{col_key}` for atomic keys and
      b. `Table{(col_key1, col_key2)}` for compound keys.

11. What is DSL for defining formula for the row? (all options)

    table RowTable:
      key {col_name} = [A, B, C] // syntax for literal row
      {col_value} = {col_name} + "@" + ColNumber

    Creates a row table:

    |col_name | A   | B   | C   |
    |---------|-----|-----|-----|
    |col_value| A@1 | B@2 | C@3 |

12. How to address column of the table? (all options)

    RowTable{A} returns scalar value "A@1"

13. What is DSL for defining for the column? (all options)

    table ColTable:
      key [row_name] = {A, B, C} // syntax for literal col
      [row_value] = [row_name] + "@" + RowNumber

    Creates a col table:

    |row_name | row_value |
    |---------|-----------|
    |A        | A@1       |
    |B        | B@2       |
    |C        | C@3       |

14. How to address the cell? (all options)

    ColTable[A] returns scalar value "A@1"

15. Having table rows are indicators, columns are years. Can I get row for profit, and later take value for 2020 for it? How?

    table Table:
      key {Year} = [2018, 2019, 2020]
      key [Indicator] = {Profit, Revenue}
      [2018] = {-90, 40}
      [2019] = {100, -50}
      [2020] = {120, 60}

    Computes to the table:

    |Table    | 2018 | 2019 | 2020 | Year |
    |---------|------|------|------|
    |Profit   | -90  | -100 | 120  |
    |Revenue  | 40   | -50  | 60   |
    |Indicator|

    Row for the profit:

        Table{Profit}

    Value for 2022:

        Table{Profit}[2020]

16. Having row, how can I say what indicator it's for?

    Preliminary definitions:
        - The syntax to compute **Row keys table** is `Table.RowKeys`. It returns a column table of valid row keys. So that `Table{Table.RowKeys{i}}` returns `i-th` row of `Table`.
        - The syntax to compute **Col keys table** is `Table.ColKeys`. It returns a row table of valid column keys. So that `Table[Table.ColKeys[i]]` returns `i-th` column of `Table`.

    Now, the row `Table{Profit}` is actually a valid 2D table, but with one row.
    It inherits all the keys from the original table (both vertical and horizontal).

    In order to return the indicator for the row, we need to get the row keys for the row:

    `Table{Profit}.RowKeys` computes to

    | Row keys  |Indicator|
    |-----------|---------|
    |     1     |Profit   |

    And then get the value for the indicator:

    `Table{Profit}.RowKeys[Indicator]` or `Table{Profit}.RowKeys{1}` which computes to "Profit".

17. Can I get column for 2020 and then take profit from it? How?

    Table[2020]{Profit}

18. Having column, how can I say what year it's for?

    Similarly to question 16.

    `Table[2020].ColKeys` computes to a row table:

    | Col keys |  1  |
    |----------|-----|
    | Year     |2020 |

    So to get the year:

    `Table[2020].ColKeys{Year}` or `Table[2020].ColKeys[1]` which computes to "2020".

19. How can I select indicators (rows) which has negative values? How can I select years (columns) which has positive profit?

    We need to introduce reducing operators for this:

    `Any(Table)` returns `True` if any of the values in the table is True. `False` on empty table.
    `All(Table)` returns `True` if all of the values in the table are True. `True` on empty table.

    The original table is:

    | Table    | 2018 | 2019 | 2020 | Year |
    |----------|------|------|------|
    | Profit   | -90  | -100 | 120  |
    | Revenue  | 40   | -50  | 60   |
    | Indicator|

    * To select indicators with negative values:

        Converting float to bools:

        `table IsNegValue = Table < 0` computes to

        | Table    | 2018 | 2019 | 2020 | Year |
        |----------|------|------|------|
        | Profit   | False| True | False|
        | Revenue  | False| True | False|
        | Indicator|

        `table IsNegIndicator = Any(IsNegValue{}[:])` computes to

        | Table    |   1  |
        |----------|------|
        | Profit   | True |
        | Revenue  | True |
        | Indicator|

        Selecting the rows using the mask:

        `table NegRowsTable = Table{IsNegIndicator}` which computes to the original table.

    * To select years with positive profit:

        `table IsPosProfitYear = Table{Profit} > 0` computes to

        | Table    | 2018 | 2019 | 2020 | Year |
        |----------|------|------|------|
        | Profit   | False| False| True |
        | Indicator|

        `table PosProfitTable = Table[IsPosProfitYear]` which computes to

        | Table    | 2020 | Year |
        |----------|------|
        | Profit   | 120  |
        | Revenue  | 60   |
        | Indicator|

20. Imagine I have table generated by RANGE(10), row number in column [r].

Now for each row I want to select indicators (rows) which have values for 2020 less than [r]?
How can I select years (columns) which has profit less than [r]?

    TBD

# Write DSL for the tables

1. 4colsxNrows. table. First three are: Country, GDP, Population, loaded from the file. Fourth column: GDP per capita = GDP/Population

    table Table:
      [Country], [GDP], [Population] = Input("file.csv")
      [GDP per capita] = [GDP] / [Population]

2. 2colsx3rows table. Rows are 1. "Revenue", 10M. 2. "Cost of Revenue", 500K. 3. "Gross profit", =Revenue - Cost of Revenue.

    table Table:
      key [Indicator] = ["Revenue", "Cost of Revenue", "Gross profit"]
      [Value] = {10M, 500K, {Revenue} - {Cost of Revenue}}

    Computes to the table

    |Indicator       | Value |
    |----------------|-------|
    |Revenue         | 10M   |
    |Cost of Revenue | 500K  |
    |Gross profit    | 9.5M  |

3. Input file with rows: (Date, Indicator, Value). Table: rows are Indicators, columns are dates cells are value. Can I write formula for new indicator or projection for the next year?

    table InputTable:
      key [Date], key [Indicator], [Value] = Input("file.csv")

    table Projection:
      key [Indicator] = InputTable[Indicator].Unique
      key {Date} = InputTable[Date].Unique.Transpose

      // {} = CurrentRow
      // [] = CurrentColumn
      // (x, y) = syntax for a tuple of x and y
      {}[] = InputTable{({}, [])}[Value]

      // Projection for the next year
      [2021] =  1.05 * [2020]

      // New indicator
      {NewInd} = {OldInd1} + {OldInd2}
