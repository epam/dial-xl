### DSL Changes

## Step 1. Static multi-column assignment & selection

There is a file `data.csv' with 3 columns: _Company_, _Country_, _Value_.
So you can use multi-assignment:

```qg
table Data
  dim [Company], [Country], [Value] = INPUT("data.csv")
```
It is position dependent. _Company_ column has position 1, so it goes into _Company_ field and so on.
The number of columns produced by a formula and the number of defined columns must be equal.

Also you can use multi-selection:
```qg
table Data
  dim [Company], [Value] = INPUT("data.csv")[[Company],[Value]]
 ```

An user cannot use short syntax for row/table references because it is not known what an user wants to use in some cases - references or values.

```qg
table Table1
  dim [Company], [Country], [Value] = INPUT("data.csv")

table Table2
  dim [Company], [Country], [Value] = Table1 # does not work

table Table3
  dim [Company], [Country], [Value] = Table1[[Company], [Country], [Value]] # works

table Table4
  dim [Company], [Country], [Value] = FILTER(Table1[[Company], [Country], [Value]], Table1[Value] > 5) # works

table Table5
  dim [Company], [Country], [Value] = FILTER(Table1, Table1[Value] > 5)[[Company], [Country], [Value]] # works
```

## Step 2. Rework Pivot & Unpivot.
### Simple syntax
```qg
PIVOT(rows, columns, values, aggregations)
```

Arguments:
 * rows - array or table: `Table[Country]` or `Table[[Country],[Company]]`
 * columns - array or table: `Table[[Date]]` or `Table[[Date],[Indicator]]`
 * values - table or array: `Table[Value]` or `Table[[Value1], [Value2]]`
 * aggregations - aggregation name: `"SUM"` or `"CORREL"` and so on

The number of columns in values argument should match with aggregation function arguments. For example:
 * SUM/COUNT/AVG - 1 argument and 1 column: `PIVOT(Table[Company], Table[Year], Table[Revenue], "SUM")`
 * CORREL - 2 arguments and 2 columns: `PIVOT(Table[Company], Table[Year], Table[[Revenue],[Expense]], "CORREL")`

Result:
 * table: the number of columns from `rows` + the number of unique values from `columns`
 * rows columns: row or row1 ... rowN. (Does it matter? If so, let's decide)
 * pivot columns: names come from `columns` argument, the name is concatenated with " & " if more than one column is supplied: `First & Second`

### Complex syntax
```qg
PIVOT(rows, columns, {values1, valuesN}, {aggregation1, aggregation2})
```

Arguments:
  * values - a list of values. The size must match with aggregations.
  * aggregations - a list of aggregation names. The size must match with values.

Result:
* table: the number of columns from `rows` + N * (the number of unique values from `columns`). N - the size of aggregations
* pivot columns: Derived from `aggregation` and `columns` arguments: `Sum of First & Second`, `Average of First & Second`.
If aggregation name match: `Sum #1 of First & Second`, `Sum #2 of First & Second`. (Let's discuss)

### Assignment
The number of declared columns must match with the number of columns from `rows` + `[*]`:
```qg
table Pivot
  dim [Country],[*] = PIVOT(Data[Country], Data[Date], Data[Value], "SUM")

table Pivot
  dim [Country], [Company], [*] = PIVOT(Data[[Country],[Company]], Data[Date], Data[Value], "SUM")
```

### Examples:
Simplest:
```qg
table Pivot
  dim [Country],[*] = PIVOT(Data[Country], Data[Year], Data[Value], "SUM")

Result  
   +---------+------+------+
   | Company | 2020 | 2021 |
   +---------+------+------+
   | Spain   |  10  |  20  |
   | France  |      |  30  |
   +---------+------+------+
```

Two columns in `rows`:
```qg
table Pivot
  dim [Country],[Company],[*] = PIVOT(Data[[Country],[Company]], Data[Year], Data[Value], "SUM")

Result:  
   +---------+---------+------+------+
   | Company | Company | 2020 | 2021 |
   +---------+---------+------+------+
   | Spain   | APPLE   |  10  |  20  |
   | Spain   | ORACLE  |  30  |      |
   | France  | APPLE   |      |  40  |
   | France  | ORACLE  |  50  |  60  |
   +---------+---------+------+------+
```

Two columns in `columns`:
```qg
table Pivot
  dim [Country],[Company],[*] = PIVOT(Data[[Country],[Company]], Data[[Year],[Quater]], Data[Value], "SUM")

Result:  
   +---------+---------+-----------+-----------+-----------+
   | Company | Company | 2020 & Q3 | 2020 & Q4 | 2021 & Q1 |
   +---------+---------+-----------+-----------+-----------+
   | Spain   | APPLE   |     10    |     20    |     30    |
   | Spain   | ORACLE  |     30    |     40    |     50    |
   | France  | APPLE   |           |     60    |     70    |
   | France  | ORACLE  |     80    |     90    |    100    |
   +---------+---------+-----------+-----------+-----------+
```

Two aggregations in `aggregations`:
```qg
table Pivot
  dim [Country],[Company],[*] = PIVOT(Data[[Country],[Company]], Data[[Year],[Quater]], {Data[Value], Data[Value]}, {"SUM", "AVG"})

Result:  
   +---------+---------+------------------+----------------------+------------------+----------------------+
   | Company | Company | Sum of 2020 & Q3 | Average of 2020 & Q3 | Sum of 2020 & Q4 | Average of 2020 & Q4 |
   +---------+---------+------------------+----------------------+------------------+----------------------+
   | Spain   | APPLE   |        10        |          1           |        50        |          5           |
   | Spain   | ORACLE  |        20        |          2           |        60        |          6           |
   | France  | APPLE   |        30        |          3           |        70        |          7           |
   | France  | ORACLE  |        40        |          4           |        80        |          8           |
   +---------+---------+------------------+----------------------+------------------+----------------------+
```

## Step 3. Unpivot
```qg
table Unpivot
  dim [Country],[Company],[Value] = UNPIVOT(Pivot, {"Microsoft"}, "Company", "Value")[Country;Company;Value]
```
The 2d argument can use FIELDS() function to filter columns dynamically: `FILTER(FIELDS(Pivot), FIELDS(Pivot) <> "Company")`.

## Step 4. Dynamic multi-field selection using `*` in any place.
```qg
table Data
  dim [*] = INPUT("data.csv")
``` 
Should we support this or not, it is still a good question.

Problems:
1. It requires compilation to figure out the fields.
2. It requires execution for the fields produced by pivot.


