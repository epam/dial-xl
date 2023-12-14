# PIVOT

PIVOT converts a table from a long format (a list of variable-value pairs that a grouped by a row key) to a wide format
(wide rows with many columns).

```
table A
   dim [a]   := INPUT("%s")
       [country]  := [a][country]
       [date]  := [a][date]
       [indicator]  := [a][indicator]
       [value]  := [a][value]

table B
   dim [a] := A.DISTINCTBY($[country], $[date])
       [country] := [a][country]
       [date] := [a][date]
       [row] := A.FILTER([country] = $[country] AND [date] = $[date])
       [*]   := [row].PIVOT($[indicator], COUNT([country]))
       [GDP Percent Change] := [GDP] + 1
       [IR2] := [*][IR] + 1
```

Table A: INPUT

| # | Country | Date | Indicator | Value |
|---|---------|------|-----------|-------|
| 0 | USA     | 2022 | GDP       | 123   |
| 1 | USA     | 2022 | GDP       | 1     |
| 2 | USA     | 2022 | IR        | 4     |
| 3 | China   | 2021 | GDP       | 121   |

DISTINCTBY(INPUT, [Country], [Date])

| # | qref | Country | Date |
|---|------|---------|------|
| 0 | 0    | USA     | 2022 |
| 1 | 3    | China   | 2021 |

[row] = INPUT.FILTER([country] = $[country] AND [date] = $[date])

| # | cref | qref | Country | Date | Indicator | Value |
|---|------|------|---------|------|-----------|-------|
| 0 | 0    | 0    | USA     | 2022 | GDP       | 123   |
| 1 | 0    | 1    | USA     | 2022 | GDP       | 1     |
| 2 | 0    | 2    | USA     | 2022 | IR        | 4     |
| 3 | 1    | 3    | China   | 2021 | GDP       | 121   |


[row].PIVOT($[indicator], COUNT($[value]))

PIVOT consists of several nodes:

a) Another DISTINCTBY(cref, [Indicator]), layout of the long table.
Rows with the same cref represent data for a single wide row.

| rn | cref | Indicator |
|----|------|-----------|
| 0  | 0    | GDP       |
| 1  | 0    | IR        |
| 2  | 1    | GDP       |

b) JOIN ON [cref], [Indicator] to aggregate multiple values for the same cell 
(see rows #0, #1 below, where rn has the same value 0).

| # | rn | cref | qref | Country | Date | Indicator | Value |
|---|----|------|------|---------|------|-----------|-------|
| 0 | 0  | 0    | 0    | USA     | 2022 | GDP       | 123   |
| 1 | 0  | 0    | 1    | USA     | 2022 | GDP       | 1     |
| 2 | 1  | 0    | 2    | USA     | 2022 | IR        | 4     |
| 3 | 2  | 1    | 3    | China   | 2021 | GDP       | 121   |

This JOIN produces 3 references:
* rn - row number for aggregation functions. We can combine several values that correspond to the same cell.
  Cannot be used to retrieve data from a current table.
* cref - current ref to project data from a current table.
* qref - query ref to project data from a query table.

Aggregation functions should use `rn` to group data, but projection should rely on `cref`.
While compiling value function (for instance, `SUM($[value]`) we use `rn` as a current reference to produce 
correct aggregates. As a result we cannot project current fields using `rn` correctly, because we should use `cref`.
We decided for now to explicitly forbid references to the current fields in the value expression.
