# Charts Feature Documentation

## Introduction
This document describes how charts are configured and how data is requested and filtered through various decorators applied to fields and tables in the DSL. The charts functionality relies on decorators that modify behavior such as selecting axes, coloring series, filtering data with selectors, and more.

---

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

---

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

---

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

---

### Row-Based vs Column-Based Series Orientation

In many cases, users want to build charts where series are defined **by rows** rather than by columns.  
To support this, charts can work in two orientations:

- **Columns** – series are taken from **columns** (default).
- **Rows** – series are taken from **rows**.

This is controlled by a `column-wise` as a second argument in the visualization decorator, e.g.
`!visualization("clustered-bar-chart", "column-wise")`

---

### Automatic Orientation Heuristic 

All created charts that supports column/row orientation are horizontal by default.

When the table has at least **one text column with unique values** across all rows, we:

- Automatically treat that column as `!x()`.
- If there are multiple such columns, we use the **first** one encountered.

---

### Manual Orientation Control (Details Panel)

Users can manually override the orientation in the **Details** panel:

- **Columns** – interpret **columns as series** (row values plotted across columns).
- **Rows** – interpret **rows as series** (each row becomes its own series).

This control allows the user to switch between row-based and column-based charts regardless of the automatic heuristic.

---

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
- X-axis scaling: linear (x position depends on numerical value).
- `!dotsize()` on a field sets dot sizes; that field does not appear as a series.
- `!dotcolor()` on a field sets dot colors; that field does not appear as a series.
- `!separator()` allows defining `!x()`, `!dotcolor()`, and `!dotsize()` per group.

### Pie Chart
- Each numeric field is a pie sector. Each row defines a separate pie chart.
- `!selector()` adds dropdown filters.
- If multiple rows remain after filtering, a row-index-based selector is added so the user can choose exactly one row.
- `!color("#FF00FF")` sets the sector color to purple.
- Orientation:
  - Vertical:
    -   Make sure !x() is supported. And if it's selected drop down shows value from !x() column instead number of row 1,2,3,4.
  - Horizontal.
      - Drop down allows to select numerical Column from which we are taking the data. 
      - !x() defines name of the segments.
      - Selected defines segment value.
      - If !dotcolor() specified it defines color of the segment.

### Clustered Bar Chart
- Supports selecting multiple rows at once.
- Each selected table row forms its own **series** (a cluster of horizontal bars), labeled by row number by default.
- For every numeric field in the section, a separate bar is drawn within the cluster; at each position (field) you see bars for all selected rows.
- If `!x()` is specified, the values of that field are used instead of row numbers to label the series.
- Orientation (same for all bar charts):
  - Vertical.
  - Horizontal.
     - rows now define bar names, and we can apply colors to them, row names (!x() or row number) goes to legend.
     - cols now define bar collections, and produce names to the collections.
     - If !dotcolor() specified it defines colors of the bars.

### Stacked Bar Chart
- Uses the same data layout as the Clustered Bar Chart: you can select multiple rows, and numeric fields define the bar positions.
- For each numeric field, one horizontal bar is drawn in which the values from all selected rows are **stacked**; each row becomes its own segment in the stack.
- If `!x()` is specified, the values of that field are used as labels for the segments/series instead of row numbers.

### Clustered Column Chart
- Uses the same configuration and data selection rules as the Clustered Bar Chart.
- Each selected table row becomes a **category** on the X-axis (labeled by row number by default).
- Each numeric field in the section defines a separate **series**; for every category, multiple vertical columns are drawn side by side (one per numeric field).
- If `!x()` is specified, the values of that field are used as category labels on the X-axis instead of row numbers.

### Stacked Column Chart
- Uses the same configuration and data selection rules as the Clustered Column Chart.
- Each selected table row is a **category** on the X-axis, and each numeric field defines a separate **series**.
- For every category, a single vertical column is drawn where the contributions of all numeric fields are **stacked vertically**; each field becomes a segment in the stack.
- If `!x()` is specified, the values of that field are used as category labels on the X-axis instead of row numbers.

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
