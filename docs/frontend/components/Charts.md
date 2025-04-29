# Charts Feature Documentation

## Introduction
This document describes how charts are configured and how data is requested and filtered through various decorators applied to fields and tables in the DSL. The charts functionality relies on decorators that modify behavior such as selecting axes, coloring series, filtering data with selectors, and more.

## Decorators

- `!x()`
  - Put on a field to set it as the x-axis.
  - By default, the row number is the x-axis if no `!x()` is specified.
  - If `!x()` is on a text field, the x-axis displays labels from that field’s values.

- `!selector()`
  - Put on a field to turn its values into a dropdown selector for filtering the chart’s data.
  - Selecting a value filters the chart’s data accordingly.
  - Multiple selectors are allowed, and each adds a dropdown for filtering.
  - Also, in case of selecting row number for some charts, this decorator can be applied to the table level.

- `!colors("#FF00FF")`
  - Put on a field to set its series color.

- `!separator()`
  - Place between fields to separate field groups. This is useful for chart types that support multiple sections or groups.
  - For some charts, it marks group boundaries that can have their own x-axis or configuration.

- `!dotsize()`
  - Put on a field (in scatter plots) to define the dot sizes. This field is not part of the series itself but modifies the appearance of the points.

- `!dotcolor()`
  - Put on a field (in scatter plots) to define the dot colors per data point if `!colors()` is not specified. This field is not part of the series itself but modifies point colors.

## Data Request and Selectors

- Initially, data is requested using existing viewport functionality (calculation request).
- Large tables may not be fully supported if filtered data exceeds 1000 points.
- Selectors display all unique values of a field. Sorting:
  - Lexicographically for strings
  - Numerically ascending for numbers
- A "Not selected" option is always at the top. If any selector is "Not selected," no data is displayed.
- If multiple selectors exist, when focusing on one selector, the dropdown only shows values that have at least one matching data point given the current selection of other selectors. Values with no matching data are shown in gray at the bottom.
- Clicking on a gray value resets other selectors to "Not selected."
- By default, all selectors start with "Not selected," resulting in no data shown.
- When a selector value is chosen, it is saved as `selector("value")` for strings or `selector(42)` for numbers in the DSL filters.
- For the chart data request, selected values are appended to the `apply filter` clause: apply filter (/existing clauses/) AND [selector1] = "value1" AND [selector2] = "value2"
- For row index selectors, the viewport’s `start_row` and `end_row` are used to apply the selection.

### Querying Selector Values

- Keep the original chart table unchanged.
- For each selector field, create a virtual table that retrieves unique values for that field. Use a GUID or unique name to avoid collisions.
- This virtual table:
  - Uses `UNIQUE()` to get distinct field values.
  - Adds a `has_values` marker to indicate if the value corresponds to existing data points given current filters.
  - Sorts by `has_values` (so matching values are first), then numerically or lexicographically.
  - For a row-index based selector, use COUNT to show possible indices and viewport parameters `start_row=%INDEX%`, `end_row=%INDEX%` to fetch data.

**DSL example to retrieve one chart selector :**

    table 'line-chart_selector_for_field_Country_MTY1MjExMDczMTY5MTM3MjM5MTE0NzgzMTI4MTQ4MjQwNjQ1MTYw'
	    dim [Country] = 'line-chart'[Country].UNIQUE()
	    [has_values] = 'line-chart'.FILTER($[World_Region] = "North America" AND [Country] = $[Country]).COUNT() > 0
    apply
    sort -[has_values],[Country]


## Chart Types

### Line Chart
- Each numeric field becomes a y-axis line.
- The x-axis defaults to row numbers unless `!x()` is defined.
- `!x()` on a field uses that field’s values for the x-axis.
- If `!color("#FF00FF")` is used, that field’s line is purple.
- `!selector()` adds a dropdown to filter data.
- `!separator()` can separate fields into groups. Each group can have its own `!x()` field, merging multiple x-axes into a single axis that accommodates all groups.

### Heat Map
- Similar to line charts, but numerical fields define rows in a heat-map grid.
- Value range is normalized to determine color intensity per cell.
- Row numbers default as the x-axis unless `!x()` is specified.
- `!separator()` is not supported in heat maps.

### Scatter Plot
- Similar to line charts, but data points are plotted as dots instead of lines.
- `!dotsize()` on a field sets dot sizes; that field does not appear as a series.
- `!dotcolor()` on a field sets dot colors; that field does not appear as a series.
- `!separator()` allows defining `!x()`, `!dotcolor()`, and `!dotsize()` per group.

### Pie Chart
- Each numeric field is a pie sector. Each row defines a separate pie chart.
- `!selector()` adds dropdown filters.
- If multiple rows remain after filtering, a row-index-based selector is added so the user can choose exactly one row.
- `!color("#FF00FF")` sets the sector color to purple.

### Bar Chart
- Works like a pie chart but displays bar visuals instead of pie sectors.

### 2D Bar Chart
- Similar to above, but multiple rows can be selected at once.
- Each selected row defines its own collection of bars, titled by row number.
- If `!x()` is specified, use that field’s values as titles for each bar collection instead of row numbers.

### Stacked Bar Chart
- Similar to a 2D bar chart, but each bar is stacked.
- `!x()` defines the stacked bars horizontally, and each numeric field defines a segment in the stack.

### Histogram
- Each numeric field defines a series.
- `!selector()` filters apply as above.
- Always includes an additional dropdown to select which series to show.
- Data is bucketed based on value ranges, with a default bucket count of `MIN(10, COUNT(Table))`.
- The number of buckets can be changed with `!visualization("histogram", <bucket_count>)`.

**DSL example to retrieve Histogram data:**

    table RevenueBucketsFixed
      dim [BucketNumber] = RANGE(10)
      [LowerBound] = Table2[GDP_PPP].MIN() + ([BucketNumber] - 1) * (Table2[GDP_PPP].MAX() - Table2[GDP_PPP].MIN()) / 10
      [UpperBound] = Table2[GDP_PPP].MIN() + [BucketNumber] * (Table2[GDP_PPP].MAX() - Table2[GDP_PPP].MIN()) / 10
      [RowCount] = Table2.FILTER($[GDP_PPP] >= [LowerBound] AND ([BucketNumber] = 10 OR $[GDP_PPP] < [UpperBound])).COUNT()


### Period series chart
It's a specialized line chart designed for period-based series data and uses its own unique data retrieval process.
