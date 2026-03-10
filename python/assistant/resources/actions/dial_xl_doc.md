# DIAL XL
Here is the description of a new programming language called DIAL XL. DIAL XL is used to manipulate tabular data.  
`Table` is a set of its `columns`. All tables' columns have the same number of `values`.  
Possible value types are: `text`, `number`, `row`, `boolean`, `date`,  also known as simple types.  
Another possible value type is an `array` which contains values of the one simple type.

`Table` might also be seen as `array` of its `rows`. Each `row` contains `value` for all the Table `columns`.  
Table is referenced by its name. E.g. `Table1` - this statement returns array of rows of the table `Table1`. Tables should have unique names.  
Columns of the table can be referenced as `Table1[a]` - this statement returns array of values of column `a` of table `Table1`.  
Table can have a dimensional column marked as `dim`. `dim` column can be built only from tables and arrays.  

Any `value` can be of simple type, `array`, `N/A` or empty.

`formula` is a code on the right side from `=`. Each formula is executed row-by-row. So, in expression 
```
table Table 
  [column] = formula
```
formula is executed for each row of the table.  
For a new line in a long formula use \.  
When a reference with table name, e.g. `Table1[a]`, it refers to table/column, and array is a returned type. When a reference starts with a column, e.g. `[column]`, it references the current row's value of the column and returns the same type. 

## Create table
Here are examples of table creation:
### Create table with RANGE
```
table NewTable
  dim [id] = RANGE(10)
  [a] = 1
  [b] = "1"
  [c] = [a] + [id]
  [d]
  [e] = NA
```
Explanation:
This example defines table `NewTable` of six columns: `id`, `a`, `b`, `c`, `d` and `e`.  
The table is defined by collection of its column definitions. Each column can be defined by a formula that is evaluated row-by-row and produces column values.  
`dim [id] = RANGE(5)` - this formula declares column `id`:
- `RANGE(5)` returns array of numbers from 1 to 5. 
- `dim` is a keyword that says that the assigned values must be spread across the rows. It means that `dim` formula defines number of rows in the table. `NewTable` has 5 rows. 
- There must be only one `dim` per table and dim formula must not depend on other columns of the table.
- Without `dim` keyword a table would have only one row.

`[a] = 1` defines a column named `a` assigns 1 to every row of the `a`.  
`[b] = [id] + 1` defines column `b` which has values from `[id]` increased by 1. Formula `[id] + 1` is evaluated for every row and statement `[id]` refers to value of `[id]` for current row.  
`[c] = [a] + [b]` defines [c] as to row-by-row sum of [a] and [b].  
`[d]` - column is defined, but no value is assigned, column values will be empty.  
`[e] = NA`  all column values are assigned to N/A values.

### Create table from INPUT
```
table NewTableFromInput
  dim [a], [b] = INPUT("data_path/table.csv")[[a], [b]]
  [c] = 1
  [d] = "1"
```
Explanation:
`table NewTableFromInput` - table definition and naming.  
`dim [a], [b] = INPUT("data_path/table.csv")[[a], [b]]` declares that columns [a] and [b] are extracted from provided csv file. Such multi-column assignment is allowed only for mapping columns from input or other tables.
Columns [a] and [b] of table `NewTableFromInput` are dimensional columns with `dim` keyword. It makes `TableFromInput` to have the same number of rows as table in "data_path/table.csv". Columns [a] and [b] will store all values from columns `a` and `b` from "data_path/table.csv". Only multi-assignment allows combined dimensional columns.

### Create table from another table
When table is created from values of another table, you can store required information in your new table with a dimensional [source] column. Such column stores rows of another table as its values. This way you can access that table data row by row.  

Example:
```
table TableASource 
  dim [source] = NewTable
  [column] = [source][a]
```
Explanation:  
`dim [source] = NewTable` means that column [source] of table `TableASource` stores all rows of table `NewTable`. Each value of [source] is a row of `NewTable`. It's a dimensional column, so each value of the column contains only one row of `NewTable`. `TableASource` will have the same number of rows as `NewTable`.  
`[column] = [source][a]` with row-by-row execution, `[source][a]` references current row of [source] column and gets the value of [a] column, as current row in [source] stores a whole row of `NewTable`.  

Example:
```
table TableAColumn 
  dim [column] = NewTable[a]
```
Explanation:  
`dim [column] = NewTable[a]` means that values of column [a] of `NewTable` are expanded across all rows, because of `dim` keyword.  

Example:
```
table TableAAllRows
  [column] = NewTable[a] # one row with all values of column a
```
Explanation:  
`[column] = NewTable[a]` as there is no `dim` keyword, this table has one row. For [column] this row contains an array of all values of `NewTable[a]`.  

Example:
```
table DerivedTable
  dim [source] = NewTable
  [col_NewTable_b_value] = [source][b] # each row is one value of [b]
  [col_c] = [source][c]
  [col_d] = [source][d]
  [col_text1] = "some constant text"
  [col_text2] = "another constant text"
  [col_text_concat] = [col_text1] & " " & [col_text2]
```
Explanation:  
`table DerivedTable` - table definition and naming.  
`dim [source] = NewTable` declares that column [source] of table `DerivedTable` stores all rows of table `NewTable`. It's a dimensional column, so each value of the column contains only one row of `NewTable`. `DerivedTable` will have the same number of rows as `NewTable`.   
`[col_NewTable_b_value] = [source][b]` is a way of accessing column [b] of `NewTable`. Row-by-row each value is a value of column [b], because it's obtained from current row value of [source] column. There is one value in each row.
`[col_c] = [source][c]` for every row of column [col_c] we take a row of `NewTable` stored in [source] and extract value of column [c].  
`[col_d] = [source][d]` for every row of column [col_d] we take a row of `NewTable` stored in [source] and extract value of column [d].
`[col_text1] = "some constant text"` sets every row of column [col_text1] to text "some constant text".  
`[col_text2] = "another constant text"` sets every row of column [col_text2] to text "another constant text".  
`[col_text_concat] = [col_text1] & " " & [col_text2]` sets every row of column [col5] equal to row-by-row concatenation of [col_text1], whitespace and [col_text2], making it being equal to "some constant text another constant text".

Example:
```
table DerivedTableFromColumns
  dim [col_с], [col_d] = NewTable[[c], [d]]
```
Explanation:  
`table DerivedTableFromColumns` - table definition and naming. This table is the same as `DerivedTable` except for lack of column [source].  
`dim [col_с], [col_d] = NewTable[[c], [d]]` declares that columns [col_с] and [col_d] are dimensional columns of table `DerivedTableFromColumns` and respectively store all values of columns [col_c] and [col_d] of table `NewTable` row-by row. `DerivedTableFromColumns` will have the same number of rows as `NewTable`.

### Manual table
When you need to explicitly populate table with data, you should create manual table.
The override section must list all manually entered columns. The override section can't contain any DIAL XL formulas. The override section must only contain values.  
Override section can't be empty, it must contain at least one value.  

Example:
```
!manual()
table TManual
  [color]
  [size]
  [color_label] = "Color: " & [color]
override
  [color],[size]
  "red", 10
  "green", 5
  "blue", 15
```
Explanation:  
`!manual()` means that this table rows are generated by manually entered data.  
As data is constantly changing, it's best to always reference existing tables and columns, when possible, rather than writing values manually.  
Use double quotes for text values if it's not table column name.

## Simple functions
DIAL XL allows to perform simple operations on text, numbers and dates. When such functions or operators are used on rows, it means that they're applied row-by-row.
### Numeric data
Supported functions are `ROUND, ABS, SQRT, FLOOR, CEIL, EXP, LOG, LN, LOG10, SIN, COS, TAN, ASIN, ACOS, ATAN, CORREL, ISNA`. These functions take number or array as an argument. E.g. `ROUND(number)` returns number, `ABS(array)` returns an array with function applied to each value.  
Supported operators are `+, - (unary and binary), / , *, ^, AND/OR, NOT, MOD`.  
Supported comparison operators are `<, >, <=, >=, =, <>`. They return boolean values TRUE/FALSE.

`ROUND(number)` rounds real number to the nearest integer. Rounding to certain precision is not supported. Rounding should be applied carefully, as it loses the precision.  

Example:
```
## table to show example of numeric manipulations
## this is a note that will be shown as part of the table
table NumericExampleTable
  ## table id
  dim [id] = RANGE(10)
  [a] = 1 / [id]
  [b] = 1 - ROUND([a])
  [c] = [a] >= [b] # will contain TRUE and FALSE values
  [d] = ([a] + [b]) * ([a] ^ 2)
  [e] = VALUE("10")
```
Explanation:  
`dim [id] = RANGE(10)` fills dim column [id] with numbers from 1 to 10.  
`## table id` is a note that will be shown as part of the column. It can contain important information about the column.  
`[a] = 1 / [id]` divides 1 by id value row-by-row.  
`[b] = 1 - ROUND([a])` subtracts rounded value in current row of column [a] from 1.  
`[c] = [a] >= [b]` will return binary TRUE and FALSE values depending on condition.  
`# will contain TRUE and FALSE values` is a comment. Not executed and not visible on the UI.  
`[d] = ([a] + [b]) * ([a] ^ 2)` - here operation priority is: ^, *, +. You can control priorities with parenthesis.  
`[e] = VALUE("10")` transforms "10" as text into 10 as a number.

Example:
```
table MathExampleTable
  dim [source] = NumericExampleTable
  [sqrt_a] = SQRT([source][a])
  [sqrt_b] = SQRT([source][b])
```
Explanation:  
`dim [source] = NumericExampleTable` each line of column [source] will contain a row of table `NumericExampleTable`.  
`[sqrt_a] = SQRT([source][a])` - each value of `[sqrt_a]` contains a square root of corresponding value of column [a] from [source].  
`[sqrt_b] = SQRT([source][b])` - each value of `[sqrt_b]` contains a square root of corresponding value of column [b] from [source].

### Text data
Supported functions are `LEN, LOWER, UPPER, TRIM, STRIP, STRIP_START, STRIP_END, CONCATENATE, CONCAT, &, SUBSTITUTE, LEFT, RIGHT, MID, CONTAINS`. All these functions can be used in two ways: `LEN(text_value)` or `text_value.LEN()`.  
Functions can be applied to the whole column like this: `LEN(TableName[column_name])`, returning array of results.

Example:
```
table ItemPrices
  dim [item_id], [region_code], [item_name], [price_with_currency] = INPUT("path/prices.csv")[[item_id], [region_code], [item_name], [price_with_currency]]
  [item_name] = "Item: " & [item_name]
  [price_with_currency] = [price_with_currency]
  [item_name_len] = LEN([item_name])
  [item_region] = LEFT([region_code], 2)
  [item_currency] = RIGHT([price_with_currency], 1)
  [price_with_usd] = SUBSTITUTE([price_with_currency], "$", "USD")
  [text_id] = TEXT([id])
  [contains_gluten] = CONTAINS([item_name], "gluten")
```
Explanation:  
`dim [item_id], [region_code], [item_name], [price_with_currency] = INPUT("path/prices.csv")[[item_id], [region_code], [item_name], [price_with_currency]]` loads table with 4 columns from csv file.  
`[item_name] = "Item: " & [item_name]` concatenates text with a text column. Alternatively, `CONCAT("Item: ", [item_name])` or `CONCATENATE("Item: ", [item_name])` can be used for text concatenation.  
`[item_name_len] = LEN([item_name])` - the column will store lengths of values in [item_name] row-by-row.  
`[item_region] = LEFT([region_code], 2)`  - the column will store first 2 characters of values in [region_code] row-by-row.  
`[item_currency] = RIGHT([price_with_currency], 1)`  - the column will store last 1 character of values in [price_with_currency] row-by-row.  
`[price_with_usd] = SUBSTITUTE([price_with_currency], "$", "USD")` - all occurrences of "$" will be replaced by "USD" for this column.  
`[text_id] = TEXT([id])` transforms numeric data into text type.  
`[contains_gluten] = CONTAINS([item_name], "gluten")` - the column value will store TRUE if the text value of the column [item_name] in current row contains word "gluten" or FALSE otherwise.
### Date data
Supported functions are `DATE(year, month, day), YEAR(date), MONTH(date), DAY(date)`.

Example:
```
table DateExampleTable
  dim [id] = RANGE(10)
  [full_date] = DATE(2025, [id], [id] + 5)
  [year] = YEAR([full_date])
  [month] = MONTH([full_date])
  [day] = DAY([full_date])
```
`[full_date] = DATE(2025, [id], [id] + 5)` creates column with dates. Year 2025, month is equal to [id] value, day is equal to [id] + 5.  
`[year] = YEAR([full_date])` extracts year from date as a number.  
`[month] = MONTH([full_date])` extracts month from date as a number.  
`[day] = DAY([full_date])` extracts day from date as a number.
## Aggregations
Aggregations for numeric arrays: `AVERAGE, SUM, STDEVP, STDEVS`.  
Aggregations for any type of arrays: `MAX, MIN, MODE`.  
Aggregations for tables and arrays of any type: `COUNT, FIRST, LAST`. 
`MODE` will return NA if all values are unique, so it is best to avoid it in intermediate tables.  

All these aggregations can be used in two ways: `COUNT(table_or_array)` or `table_or_array.COUNT()`.

Aggregation functions for arrays must be applied like this: `MAX(Table[column])`.

Example:
```
table TBase
  dim [id] = RANGE(20)
  [a] = ROW() + 10
  [b] = [a] ^ 2

table TAggregations
  [a_count] = COUNT(TBase[a])
  [a_sum] = SUM(TBase[a]) # TBase[a] is numeric
  [b_first] = FIRST(TBase[b])
  [b_avg] = AVERAGE(TBase[b]) # TBase[b] is numeric
  [b_max] = MAX(TBase[b])
  [b_2nd] = TBase[b].INDEX(2)
```
Explanation:  
Table `TAggregations` doesn't have `dim` column which means it has only one row.
`[a_count] = COUNT(TBase[a])` number of elements in array `TBase[a]`.  
`[a_sum] = SUM(TBase[a])` equals total sum of all elements in TBase[a]. TBase[a] is a numeric array, so we can apply `SUM` aggregation.  
`[b_first] = FIRST(TBase[b])` equals to first value of column TBase[b].  
`[b_avg] = AVERAGE(TBase[b])` equals to the average of all values in column TBase[b]. TBase[b] is a numeric array, so we can apply `AVERAGE` aggregation.  
`[b_max] = MAX(TBase[b])` equals to the max of all values in column TBase[b].  
`[b_2nd] = TBase[b].INDEX(2)` equals to 2nd element in column TBase[b].  

You can use `FIRST` as a convenient way to get a value from array of length 1. Continuing previous example:
```
table TFirstExample
  [row_count_list] = TAggregations[tbase_row_count]
  [row_count_single] = FIRST(TAggregations[tbase_row_count])
  [tbase_row_count_single] = FIRST(COUNT(TBase))
```
Explanation:  
Table `TFirstExample` also has only 1 row, because there is no `dim`.  
`[row_count_list] = TAggregations[tbase_row_count]` - the only value in column [tbase_row_count_list] would be `[20]`, an array with one value.
`[row_count_single] = FIRST(TAggregations[tbase_row_count])` - the only value in column [tbase_row_count_single] would be a single number `20`.  
`[tbase_row_count_single] = FIRST(COUNT(TBase))` - value in this column is identical to the value in [row_count_single], but it is calculated straight from `TBase` table.  

To calculate number of rows and columns in the table you can use `COUNT` and `FIELDS`:
```
table TRowsCols
  [tbase_row_count] = COUNT(TBase)
  [tbase_col_count] = COUNT(TBase.FIELDS())
```
Explanation:
`[tbase_row_count] = COUNT(TBase)` equals to number of rows in table `TBase`.  
`[tbase_col_count] = COUNT(TBase.FIELDS())` function `FIELDS` returns a list of column names of the table `TBase`. Function `COUNT` will return a number of those columns.
## Array functions
Supported functions for arrays are `FILTER, SORTBY, UNIQUE, IN`.

Example:
```
table T0
  dim [id] = RANGE(10)
  [a] = ROW() + 10
  [b] = [a] ^ 0.5
  [c] = "text " & [b]
  
table T1
  dim [id] = RANGE(5)
  [col1] = "some text"
  [col2] = FALSE
  
table T2
  dim [uuid], [reference_col]  = INPUT("path_to_data/table_file.csv")[[uuid], [reference_col]]
```
### Sorting
`SORTBY(table_or_array, comma_separated_keys, optional_direction)` function can sort the table by any number of keys from that table and returns rows. It can be applied to array as well: `SORTBY(column_name, comma_separated_keys, optional_direction)`, then it returns sorted array. Alternative way is `table_or_array.SORTBY(comma_separated_keys, optional_direction)`.

Example:
```
table TSortedColumn
  dim [a] = SORTBY(T0, T0[a])[a]
```
Explanation:  
`TSortedColumn` has one column [a] that contains all values of `T0[a]` sorted in ascending order. Table `TSortedColumn` has the same length as `T0`.

Example:
```
table TSortedColumn
  dim [a] = SORTBY(T0, T0[a], -1)[a]
```
Explanation:  
`TSortedColumn` has one column [a] that contains all values of `T0[a]` sorted in descending order. Table `TSortedColumn` has the same length as `T0`.

Example:
```
table TSortedTable
  dim [source] = SORTBY(T0, T0[a], 1, T0[b], -1)
  [a] = [source][a]
  [b] = [source][b]
```
Explanation:  
`TSortedTable` has column [source] that stores sorted rows of `T0` and has the same length. Rows of `T0` in [source] are sorted by [a] in ascending order and then by [b] in descending order.  
`[a] = [source][a]` refers to a current row's value of column [a] of column [source].
`[b] = [source][b]` refers to a current row's value of column [b] of column [source].

### Unique
`UNIQUE(array)` function can return all unique values from array.
```
table TUnique
  dim [b_unique] = UNIQUE(T0[b])
```
Explanation:  
Table `TUnique` has one column [b_unique] that contains unique values of `T0[b]`.
### Conditions
Columns can be populated based on condition with `IF(condition, value_if_true, value_if_false)` and `IFNA(value, value_if_na)` functions.

Example:
```
table TConditions
  dim [condition_id] = RANGE(5)
  [a] = IF([condition_id] = [condition_id] ^2, 10, NA)
  [b] = IFNA([a], 5)
```
Explanation:  
`[a] = IF([condition_id] = [condition_id] ^2, 10, NA)` will populate [a] row with 10 if condition is satisfied and with N/A otherwise.  
`[b] = IFNA([a], 5)` will populate [b] with values from [a] and replace N/A with 5.
### Filtering
`FILTER(table_or_array, condition)` is a powerful function for filtering tables and arrays based on condition. It returns a table oran  array. It can also be used like this `table_or_array.FILTER(condition)`.

Example:
```
table TSimpleFilter
  dim [source] = FILTER(T0, T0[b] <= 4)
  [a] = [source][a]
  [b] = [source][b]
```
Explanation:  
`dim [source] = FILTER(T0, T0[b] <= 4)` here we filter table `T0`. `T0[b]` is an array of values from column [b] of table `T0` that we check to be less than 4. Filtered values are stored in [source] column row-by-row because of the `dim` keyword.  
`[a] = [source][a]` column [a] contains all values of column [a] of [source], where [source] stores filtered rows of `T0`.  
`[b] = [source][b]` column [b] contains all values of column [b] from [source], where [source] stores filtered rows of `T0`.  

Example:
```
table MaxAValue
  [max_a_value] = MAX(T0[a])

table TFilterColumn
  dim [filtered_id] = FILTER(T0, T0[b] > MaxAValue[max_a_value].FIRST())[id]
```
Explanation:  
`dim [filtered_id] = FILTER(T0, T0[b] > MaxAValue[max_a_value].FIRST())[id]` - each value will contain values from column [id] of rows of table `T0` that match the condition. `dim` means that values of returned array will define number of rows of `TFilterColumn`.

### Filter with Sorting 
If a filtered table is sorted, it is important for keys to be from the same table, a table after filtering: `SORTBY(FILTER(table, condition), FILTER(table, condition)[key], optional_direction)`.

Example:
```

table TFilterColumn
  dim [filtered_id] = SORTBY(FILTER(T0, T0[b] > MaxAValue[max_a_value]), FILTER(T0, T0[b] > MaxAValue[max_a_value])[b])
```
Explanation:  
`dim [filtered_id] = SORTBY(FILTER(T0, T0[b] > MaxAValue[max_a_value]), FILTER(T0, T0[b] > MaxAValue[max_a_value])[b])` - filtered table is sorted by its column `b`.

### Group By
To group values by values of a column and aggregate values with an aggregation function, `GROUPBY(grouped_columns, aggregated_columns, corresponding_aggregation_functions, optional_filter)` function is used. 

Example:
```
table Data
  dim [column1], [column2], [num_column1], [num_column2], [num_value3] = INPUT("path/data.csv")

table TSimpleAggregate
  dim [column1], [num_column1_sum] = GROUPBY(Data[column1], Data[num_column1], "SUM")
  
table TAggregateByOneColumnTwoValues
  dim [column1], [num_cols_sum] = GROUPBY(Data[column1], Data[[num_column1], [num_column2]], "SUM")
```
Explanation:  
`dim [column1], [num_column1_sum] = GROUPBY(Data[column1], Data[num_column1], "SUM")` - table `Data` is grouped by column `column1` and maps a unique value of `column1` to a sum of corresponding values of column `num_column1`.  
`dim [column1], [num_cols_sum] = GROUPBY(Data[column1], Data[[num_column1], [num_column2]], "SUM")` - table `Data` is grouped by column `column1` and maps a unique value of `column1` to a row-by-row sum of `num_column1` and `num_column2`.  


When a filter is combined with group by, the last parameter of `GROUPBY` can be used to specify filtering condition.  
Example:
```
table AggregateWithFilter
  dim [column1], [num_column1_sum], [num_column2_count] = GROUPBY(Data[column1], Data[[num_column1], [num_column2]], {"SUM", "COUNT"}, Data[column1] = "Value1" AND Data[column2] = "Value2")
```
Explanation:  
`dim [column1], [num_column1_sum], [num_column2_count] = GROUPBY(Data[column1], Data[[num_column1], [num_column2]], {"SUM", "COUNT"}, Data[column1] = "Value1" AND Data[column2] = "Value2")` - table `Data` is filtered by columns `column1` and `column2`. It's aggregated  by `column1` and maps a unique value of `column1` to a sum of corresponding values in column `num_column1` and a number of values in column `num_column2`.  


Multiple aggregation functions can be provided in curly brackets in the order corresponding to provided aggregated columns.  
It is also possible to group by multiple columns.  
Example:
```
table TNestedGroupBy
  dim [column1], [column2], [num_cols_correl], [num_column3_sum] = GROUPBY(Data[[column1], [column2]], Data[[num_column1], [num_column2], [num_column3]], {"CORREL", "SUM"})
```
Explanation:
`dim [column1], [column2], [num_cols_correl], [num_column3_sum] = GROUPBY(Data[[column1], [column2]], Data[[num_column1], [num_column2], [num_column3]], {"CORREL", "SUM"})` - table `Data` is aggregated by two columns: `column1` and `column2`. Table `TComplexAggregate` maps unique values of `column1` and `column2` to the correlation of values in columns `num_column1` and `num_column2` and a sum of values in column `num_column3`.  

### Examples
In this section you can find examples for FILTER and other functions based on data about sold clothes.

Data for the examples:
```
!manual()
table TClothes
  [id]
  [price]
  [name]
override
  [id], [price],[name]
  1, 20, "t-shirt"
  2, 40, "shirt"
  3, 100, "skirt"
  4, 2000, "jacket"
  5, 500, "dress"
  
!manual()
table TSale
  [sale_price]
  [item_id]
  [item_name]
override
  [sale_price], [item_id], [item_name]
  10, 1, "t-shirt"
  250, 5, "dress"
  
table TPurchases
  dim [purchase_id], [clothes_id], [clothes_name], [purchase_date], [cost] = INPUT("path_to_data/purchases.csv")[[purchase_id], [clothes_id], [clothes_name], [purchase_date], [cost]]
```

#### Sale items purchases:
We can find all purchased items that are now on sale.
```
table PurchasedSaleItems
  dim [source] = TPurchases.FILTER(IN(TPurchases[clothes_id], TSale[item_id]))
  [clothes_id] = [source][clothes_id]
  [purchase_date] = [source][purchase_date]
```
Explanation:  
`dim [source] = TPurchases.FILTER(IN(TPurchases[clothes_id], TSale[item_id]))` here [source] will row-by-row store filtered rows of `TPurchases` table that satisfy the condition. `IN(value, array)` function checks if value on current row of `TPurchases[clothes_id]` is among values in `TSale[item_id]`. This way rows for sale items are extracted.
#### Top 3 example:
Here we find top 3 cheapest items in manual table `TClothes`.
```
table Top3CheapPrices
  dim [source] = SORTBY(TClothes, TClothes[price]).FIRST(3)
  [price] = [source][price]
  [name] = [source][name]
```
Explanation:  
`dim [source] = SORTBY(TClothes, TClothes[price]).FIRST(3)` table `Top3CheapPrices` will have 3 rows, column [source] contains rows from `TClothes`.
#### Most frequent example:
Here we find most popular item from `TPurchases` table.
```
table TPurchasesFrequency
  dim [clothes_id], [purchases_count] = GROUPBY(TPurchases[clothes_id], TPurchases[clothes_id], "COUNT")
  
table MostFrequentTable
  [most_frequent_clothes_id] = SORTBY(TPurchasesFrequency, TPurchasesFrequency[purchases_count], -1).FIRST()
  
table MostFrequentTableAlternative
  [most_frequent_clothes_id] = MODE(TPurchases[clothes_id])
```
Explanation:  
Helper table `TPurchasesFrequency` is created to gather clothes ids and number of times they were purchased.
`dim [clothes_id], [purchases_count] = GROUPBY(TPurchases[clothes_id], TPurchases[clothes_id], "COUNT")` - groups table `TPurchases` by unique values in column `clothes_id` and maps them to the number of times the value was present in column `clothes_id`.  
Resulting table `MostFrequentTable` has one column with a one value that contains first row from `TPurchasesFrequency` sorted in descending order. Note, that there is no `dim` keyword, because there is one value for one row.  
Additionally, `MostFrequentTableAlternative` table shows simpler way of getting one most frequently purchased item.

#### Filtering by date
Here we find the number of jackets sold in the last two weeks of June:
```
table TLateJuneJackets
  [jackets_count] = TPurchases.FILTER(MONTH(TPurchases[purchase_date]) = 6 AND \
   DAY(TPurchases[purchase_date]) >= 15 AND \
   TPurchases[clothes_id] = 4).COUNT()
```
Explanation:
`[jackets_count] = TPurchases.FILTER(MONTH(TPurchases[purchase_date]) = 6 AND DAY(TPurchases[purchase_date]) >= 15 AND TPurchases[clothes_id] = 4).COUNT()` filters purchases in `TPurchases` by month and day. Additionally, it checks for the purchased clothes id to be the one for jacket. For the result of this filter we calculate the number of rows. `\` serves as a new line separator.  

## Decorators
Existing decorators:  
`!layout(2, 2, "title", "headers")` for placing table in a specific location on the sheet.  
`!size(3)` for setting column width (default = 1).  
`!manual()` for manual table declaration.
