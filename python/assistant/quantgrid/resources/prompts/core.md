### DIAL XL ###

**DIAL XL** (abbreviated as XL) is python 3.12 framework for tabular data generation pipelines definition with focus on big data support and special python compiled dialect.

### DIAL XL Fundamentals ###

XL python framework operates on `Table` entities.

1. **Table Schemas** are defined using regular python classes, inherited from `Table` type.
2. **Row Format** schemas are defined using special type annotations:
    - `Field[Type]`: Basic field that stores single value of type `Type`.
    - `Dimension[Type]`: Special subtype of `Field[Type]` that affects table row count through array unnest operation.
3. **Fields Generation Rules** are defined per-field using `@TableName.field_name` decorator on functions of special protocol.

Example:

```python
class ExampleTable(Table):  # Declare new Table type.
    example_dimension: Dimension[Number]  # Declare new dimension of `Number` type.

 @ExampleTable.example_dimension  # Declare decorated function as `example_dimension` content producer.
 def dimension_function(
         row_num: Number,  # Capture the index (1-based) of current processing row.
         row_ref: RowRef['ExampleTable']  # Capture the reference to current processing row.
 ) -> Array[Number]:  # Produce array of `Number` values to be unnested and inserted inside resulting `ExampleTable`.
     ...


ExampleTable.example_field = Field(  # Fields may be also declared outside of parent table if needed.
    ui_name="Pretty name",  # Define formatted name.
    ui_note="Custom note",  # Define custom note.
    value_type=Str  # Define value type.
)
```

All field types supports explicit initialization in case additional configuration metadata is needed:

```python
class ExampleTable(Table, ui_name="Example Table Name"):
   example_dimension: Dimension[Number] = Dimension(ui_name="Dimension Name", ui_note="Dimension Note")
   example_field: Field[Number] = Field(ui_name="Field Name", ui_note="Field Note")
```

**Attention:** Annotations must be consistent with actual provided type:

- If `Field` annotation is used - `Field` object is expected.
- If `Dimension` annotation is used - `Dimension` object is expected.
- If no `Dimension` are present in the table, such table will have one row. This may be convenient for single-cell / single-line tables.

### DIAL XL Type Hierarchy ###

XL **does not support arbitrary types** inside tables. Instead, special type hierarchy of immutable types must be used:

```python
class Type: ...  # `Type` is the base type of type hierarchy.
class Primitive(Type): ...  # `Primitive` is the base type for all scalar-like types.
class Number(Primitive): ...  # `Number` type represents both floating and integer values.
class Str(Primitive): ...  # `Str` type represents arbitrary text sequences.
class Bool(Primitive): ...  # `Bool` type holds only one True / False value.
class Date(Primitive): ...  # `Date` type contains year-month-day information.
class RowRef[T: Table](Type): ...  # `RowRef[T: Table]` type holds reference to single row of particular table. 
class Array[E: Type](Type): ...  # `Array[E: Type]` type represents homogeneous ordered sequence of XL type values.
class Pivot[E: Type](Type): ...  # `Pivot[E: Type]` type provides access to dynamic (content-dependent) fields on indexing.
```

**Attention:**

1. All XL types are **immutable**.
2. XL `Primitive` type generally aligns with Python built-in types (`int, float, str, bool`) and follows conventional logic, although their exact functions set differ.

### DIAL XL Field Functions ###

`@TableName.field_name` decorated functions are linked to the field as value producer.
Decorated functions defines actual algorithm of values generation.

Decorated function:

1. May request row number `Number` as parameter. This value denotes current table row number (1-based indexing).
2. May request row reference `RowRef[T]` as parameter. This reference may be used to access other table fields on the same row.
3. Must return a type compatible with the linked field.
4. Must annotate parameters and return type.
5. Must use special XL Python dialect to be compiled successfully.

### DIAL XL Field Functions Restricted Syntax ###

Decorated function **must comply** with the following rules:

1. Only XL `Type` hierarchy objects usage is allowed.
2. All objects are **immutable**.
3. Numeric literals are treated as `Number`.
4. String literals are treated as `Str`.
5. Booleans literals (`True` and `False`) are treated as `Bool`.
6. List literals (`[]`) are treated as `Array`.

The following functionality is **prohibited** inside decorated functions:

1. Any non-XL types are forbidden.
2. Loops: `for, while, comprehension` are forbidden.
3. Collections: `tuple / list / dict / set` are forbidden.
4. Packing / unpacking: `*` is forbidden.
5. `match` blocks are forbidden.
6. `lambda` is prohibited.

Example:

```python
class ExampleTable(Table):
    dimension: Dimension[Number]
    field: Field[Number]

 @ExampleTable.dimension
 def dimension_function(row_num: Number, row_ref: RowRef['ExampleTable']) -> Array[Number]:
     number: Number = 100  # Integer literals are treated as `Number` type.
     float: Number = 100.100  # Floating-point literals are also treated as `Number`.
     string: Str = "text"  # String literals are treated as `Str`.
     boolean: Bool = True  # Boolean literals are treated as `Bool`.
     explicit_array: Array[Str] = ["1", "2", "3"]  # List literals are treated as `Array` creation.
     field_value = row_ref.field  # RowRef[T] provides access to table fields on the same row.
     
     if number + 10 == 100 or boolean:  # XL Primitive types follow regular type convention. 
         return explicit_array.as_numbers() # XL types may be used as any other Python type.
         
     field_array: Array[Number] = Array.from_field(ExampleTable.field)  # Arrays can be created from table fields.
     row_array: Array[RowRef[ExampleTable]] = Array.from_table(ExampleTable)  # Arrays can hold RowRef objects and be created from tables.
     
     indexed_array: Number = field_array[0]  # Arrays support indexing.
     sliced_array: Array[Number] = field_array[: -1]  # Arrays support slicing.
     
     extracted_array: Array[Number] = field_array.field  # Array[RowRef] may be sliced by field using attribute access notation.
     other_extracted_array: Array[Number] = field_array.slice_field(ExampleTable.field)  # Array[RowRef] may be sliced by field using functional notation.
      
     return extracted_array
```

### DIAL XL Nested Functions ###

DIAL XL supports nested functions inside decorated field-linked function. All nested functions must be annotated.
Nested functions are treated as independent and separate compute graph units, therefore theis access scope is restricted.

Example:

```python
@Table.field
def field_function() -> Array[Number]:
    
    def filter_array(item: Number) -> Bool:  # Nested function must be type annotated.
        return item % 10
        
    array: Array[Number] = Array.from_range(0, 100)  # Create array from range.
    
    filtered_by_compute_node = array.filter(filter_node)  # Suitable nested function may be passed into function.
    return filtered_by_compute_node
```

**Attention:**

1. Nested function may be only defined directly inside decorated field linked function.
2. Nested functions cannot contain other function inside their body.
3. Nested functions can only access their own variables and variables of main decorated function.

Example:

```python
@Table.field
def field_function(row_ref: RowRef[...]) -> Number:
    parent_var = 100

    def func_a(x: Number) -> Bool:
        return x > parent_var  # OK. Can access scope of main decorated function.
        
    def func_b(y: Number) -> Bool:
        return y > x  # ERROR. Cannot access parameter from other nested functions.

    return Array.from_range(1, 1000).filter(func_a)
```

### DIAL XL Table Computation Pipeline ###

DIAL XL tables have the following features:

1. Table content is calculated **field-by-field**, and every field is calculated **row-by-row**, invoking linked functions for every row.
2. DIAL XL table fields are **aligned**. Across one table, all fields contain the same number of values.

Table number of rows is dictated by `Dimension` fields. `Dimension` field works similarly to `unnest` SQL operation.
`Dimension[FieldType]` linked function must return `Array[FieldType]`, as returned array will be unnested into field values and inserted into the table as new rows.
On insertion, other field values will be duplicated across inserted new rows.

Regular `Field` fields defines only field values. Values, produced by linked function are directly inserted into field value cell.

Example:

```python
class ExampleTable(Table):
    first_dimension: Dimension[Str]
    first_field: Field[Str]
    
    second_dimension: Dimension[Number]
    second_field: Field[Str]
    
    nested_field: Field[Array[Number]]  # Field with nested `Array[Number]`.
    
 @ExampleTable.first_dimension
 def compile_first_dimension() -> Array[Str]:  # `Dimension` linked function must return `Array[Str]` for unnesting.
     return ["a", "b", "c"]
     
 @ExampleTable.first_field
 def compile_first_field() -> Str:  # `Field` linked function must return field type.
     return "x"
     
 @ExampleTable.second_dimension
 def compile_second_dimension() -> Array[Number]:
     return [1, 2]
     
 @ExampleTable.second_field
 def compile_second_field(row_ref: RowRef['ExampleTable']) -> Str:
     if row_ref.first_dimension == "a":
         return "A"
     elif row_ref.first_dimension == "b":
         return "B"
     else row_ref.first_dimension == "c":
         return "C"
         
 @ExampleTable.nested_field
 def compile_nested_field() -> Array[Number]:  # Returned `Array[Number]` will be directly nested inside `nested_field` value.
     return [1, 2, 3] 
```

`ExampleTable` contents after compilation and computation:

| first_dimension | first_field | second_dimension | second_field | nested_field |
|-----------------|-------------|------------------|--------------|--------------|
| a               | x           | 1                | A            | [1, 2, 3]    |
| a               | x           | 2                | A            | [1, 2, 3]    |
| b               | x           | 1                | B            | [1, 2, 3]    |
| b               | x           | 2                | B            | [1, 2, 3]    |
| c               | x           | 1                | C            | [1, 2, 3]    |
| c               | x           | 2                | C            | [1, 2, 3]    |

### Pivot (Wide Pivot) ###

DIAL XL supports table pivoting (wide pivot) using special `Pivot` type.

Example:

```python
class Countries(Table):
   country: Dimension[Str]
   population: Field[Number]
   
class PivotedCountries(Table):
   populations: Field[Pivot[Number]]
   
@PivotedCountries.populations
def populations_function() -> Pivot[Number]:
   
   def field_names(row: RowRef[Countries]) -> Str:  # Function to produce new field names.
      return row.country
      
   def bucket_aggregation(bucket: Array[RowRef[Countries]]) -> Number:  # Function to aggregate rows in each bucket.
      return bucket.slice_field(Countries.population)[0]
      
   return Array.from_table(Countries).pivot(field_names, bucket_aggregation)
```

`Countries` contents after compilation and computation:

| country   | population |
|-----------|------------|
| USA       | 1          |
| China     | 2          |
| India     | 3          |
| Indonesia | 4          |
| Brazil    | 5          |

`PivotedCountries` contents after compilation and computation:

| USA | China | India | Indonesia | Brazil |
|-----|-------|-------|-----------|--------|
| 1   | 2     | 3     | 4         | 5      |

Explanation:

1. Table `Countries` contains two fields with country-population statistic.
2. Table `PivotedCountries` will have as many columns as there are unique countries, and each field will have one value with country populations (as no Dimensions are present in `PivotedCountries`).
3. First `.pivot` parameter function produce new fields names.
4. Second `.pivot` parameter function defines aggregation rule across new fields. This function receives `Array[RowRef]` of rows grouped by new field names and produce one value for each group.

**Attention**: Only one `Pivot` value type field is allowed for each table.

### Unpivot (Long Pivot) ###

DIAL XL supports table un-pivoting (long pivot).

Example:

```python
class Metrics(Table):
   experiment_number: Dimension[Number]
   metric_1: Field[Number]
   metric_2: Field[Number]
   
class MetricInfo(Metrics):  # Declare inherited table scheme to hold additional long pivot added fields.
   metric_name: Field[Str]
   metric_value: Field[Number]
  
class UnpivotedMetrics(Table):
   metric_info: Dimension[RowRef[MetricInfo]]  # Dimension to unnest Un-pivot results
   metric_name: Field[Str]  # Field to reference original metric name (`metric_1` or `metric_2`)
   metric_value: Field[Number]  # Field to reference original metric value
   
@UnpivotedMetrics.metric_info
def metric_info_function() -> Array[RowRef[MetricInfo]]:
   
   def field_filter(field_name: Str) -> Bool:
      return field_name != "experiment_number"

   return Array.from_table(Metrics).unpivot(
      MetricInfo.metric_name,
      MetricInfo.metric_value,
      field_filter
   )
   
@UnpivotedMetrics.metric_name
def metric_name_function(row_ref: RowRef['UnpivotedMetrics']) -> Str:  
   return row_ref.metric_name
   
@UnpivotedMetrics.metric_value
def metric_value_function(row_ref: RowRef['UnpivotedMetrics']) -> Number:
   return row_ref.metric_value
```

`Metrics` contents after compilation and computation:

| experiment_number | metric_1 | metric_2 |
|-------------------|----------|----------|
| 1                 | A        | X        |
| 2                 | B        | Y        |
| 3                 | C        | Z        |

`UnpivotedMetrics` contents after compilation and computation:

| metric_name | metric_value |
|-------------|--------------|
| metric_1    | A            |
| metric_2    | X            |
| metric_1    | B            |
| metric_2    | Y            |
| metric_1    | C            |
| metric_2    | Z            |

Explanation:

1. Table `Metrics` contains sequence of experiments with two fields with experiments metrics (`metric_1` and `metric_2`).
2. `.unpivot` produces row references to special table, that contains all original table fields and two additional fields: for field names and field values.
3. `MetricInfo` inherits from `Metrics` and defines two additional fields to hold un-pivot results. Using inheritance, `MetricInfo` avoid field name mismatches between original table and un-pivoted row references.
4. `UnpivotedMetric` table will contain as many rows as there are metrics values in original table, as `unpivot` returns array of row references, and `metric_info` is `Dimension`.
5. First `.unpivot` parameter receives field to store original field names in.
6. Second `.unpivot` parameter receives field to store original field values in.
7. Third `.unpivot` parameter is optional and receives function to filter out field **UI names** to ignore in long-pivot.

### DIAL XL Tables Post-Creation Modification ###

All fields types may be created both inside and outside the table:

```python
class ExampleTable(Table):
   inside_created_field: Dimension[Number]

ExampleTable.outside_created_field = Field(value_type=Str)  # Outside-class defined fields must specify `value_type` to specify field type.
```

When attributes of `Table`, `Field` or `Dimension` needs to be changed, set required attribute directly:

```python
class ExampleTable(Table, ui_name="First Name"):
   dimension: Dimension[Number]
   field: Field[Str]
   
ExampleTable.ui_name = "Changed Table Name"  # Modification of `Table` UI name
ExampleTable.dimension.ui_name = "Changed Dimension Name"  # Modification of `Dimension` UI Name
ExampleTable.field.ui_note = "Changed Field Name"  # Modification of `Field` UI Note
```

DIAL XL tables support deletion of tables and all field types:

```python
class ExampleTable(Table):
   example_field: Field[Number]
   
del ExampleTable.example_field  # Delete `example_field` from table `ExampleTable`.
del ExampleTable  # Delete `ExampleTable` from DIAL XL workspace.
```