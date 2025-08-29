### Format resolution for a list of columns

#### Scenarios

The result format should be determined in cases where multiple formulas or columns are combined to produce
a single column:

* Inline list
```
table A
  [a] = {1, DATE(2020, 1, 2), 1=1}
```
* Overrides
```
!manual()
table A
  [a]
overrides
[a]
1
DATE(2020, 1, 2)
1=1
```
* Unpivot
```
table S
  [x] = 1
  [y] = DATE(2020, 1, 2)
  [x] = 1=1

table A
  dim [*] = S.UNPIVOT("name", "value")
```

#### Implementation
The following rule, as the initial implementation, was chosen merely due to its simplicity and ability to maintain
consistent behavior in the following example.

Rule:
```
Format1, Format2 => General
Format1, General => Format1
```
Example:
```
table A
  !format("currency", 2, 1, "$")
  [a]
override
[a]
12345
300

table B
  dim [b] = A[a]
override
row,[b]
2,123
```
Where formulas without explicit formats do not affect source formatting:
![ccy-format.png](ccy-format.png)