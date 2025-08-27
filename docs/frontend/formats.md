# Formatting Module Documentation

Formatting handle various data formats that are applied to grid cells. This documentation outlines the available data formats and describes how each format is processed.

## Applying formats

During app using user can apply formats to grid fields and it will reflected in dsl like: `!format('boolean')` or more complex `!format("date", "LL d, yyyy")`.

Next formats can be applied on frontend app side:

1. General - this is default formatting which just passing data as is. It should be not written in dsl
2. `text`
3. `number`
4. `boolean`
5. `scientific`
6. `currency`
7. `date`
8. `percentage`

Also formatting can be applied using some functions which propagates it to result like `Date()`.

If formatting applied backend will send its name and arguments in calculate response with data and frontend app will try to format it using some logic.

## Handling Non-Numeric Values

For the formatted grid presentation, any values that do not conform to numeric types or cannot be parsed as numbers will remain unchanged. This behavior is consistent across the different format types, ensuring that non-numeric input isn’t altered unexpectedly.

## Formats Overview

The application supports several formats for displaying data within a grid. Formats are specified using the `FormatType` enum and corresponding `FormatArgs`. They dictate how raw data values should be presented, including text, numbers, dates, and specific numeric formats like currency or percentages.

### Supported Format Types

1. **Boolean**

   - **Type:** `FORMAT_TYPE_BOOLEAN`
   - **Description:** Converts non-zero numerical values to 'TRUE' and zero to 'FALSE'.

2. **Number**

   - **Type:** `FORMAT_TYPE_NUMBER`
   - **Description:** Formats numeric values with optional thousands separators and a specified number of decimal digits.

3. **Scientific**

   - **Type:** `FORMAT_TYPE_SCIENTIFIC`
   - **Description:** Displays numbers in scientific notation with a specified number of decimal digits.

4. **Percentage**

   - **Type:** `FORMAT_TYPE_PERCENTAGE`
   - **Description:** Converts numbers into percentages, multiplying by 100 and appending a '%' symbol, with a defined number of decimal digits.

5. **Currency**

   - **Type:** `FORMAT_TYPE_CURRENCY`
   - **Description:** Formats numbers as currency, using a specified currency symbol and optionally including thousands separators along with a defined number of decimal digits.

6. **Date**
   - **Type:** `FORMAT_TYPE_DATE`
   - **Description:** Formats numerical date values from a serial date format to standard date strings using a specified pattern.

## Detailed Format Processing

### Boolean Formatting

- **Logic:**
  - Any non-zero number is translated to 'TRUE'.
  - Zero is rendered as 'FALSE'.

### Number Formatting

- **Locale Used:** `en-US`
- **Arguments:** `NumberFormatArgs` (includes `decimalDigits` and `useThousandsSeparator`)
- **Logic:**
  - Uses `Intl.NumberFormat` with the `en-US` locale to apply thousands separators (if specified) and control decimal places.
  - Fallbacks to `Number.prototype.toFixed` for precise decimal formatting when not using separators.

### Scientific Formatting

- **Arguments:** `ScientificFormatArgs` (includes `decimalDigits`)
- **Logic:**
  - Converts numbers to exponential notation using JavaScript's `toExponential` method, rounding to the specified number of decimal digits.

### Percentage Formatting

- **Arguments:** `PercentageFormatArgs` (includes `decimalDigits`)
- **Logic:**
  - Multiplies numbers by 100 and appends a '%' character.
  - Uses `toFixed` to round to the desired number of decimal places.

### Currency Formatting

- **Locale Used:** `en-US`
- **Arguments:** `CurrencyFormatArgs` (includes `symbol`, `decimalDigits`, and `useThousandsSeparator`)
- **Logic:**
  - Prefixes the number with the defined currency symbol.
  - Utilizes `Intl.NumberFormat` for applying thousands separators and managing decimal digits in the `en-US` locale.

### Date Formatting

- **Arguments:** `DateFormatArgs` (includes `pattern`)
- **Logic:**
  - Converts serial date numbers into JavaScript dates.
  - Uses an internal function for date conversion, which calculates the milliseconds since January 1, 1970, based on a base date of December 30, 1899.
    - This computation accounts for the number of days from the base date, adjusting to the Unix epoch start.
    - Each serial date corresponds to 24 \* 60 \* 60 \* 1000 milliseconds per day.
  - Utilizes `date-fns` for formatting:
    - Employs `formatDate` from `date-fns` with `UTCDateMini`, ensuring that the date is created and formatted in UTC.
    - The `pattern` provided in `DateFormatArgs` specifies the format (e.g., 'yyyy-MM-dd', 'MMM dd, yyyy'), following `date-fns` patterns.
    - Supports additional tokens for day of the year and week year for more complex formatting needs.

## Use in `GridBuilder.ts`

The `GridBuilder` class in `GridBuilder.ts` uses the `formatValue` function (imported from `format.ts`) to process and render cell values in a grid. It integrates cell styling, alignment, and additional metadata handling along with formatting operations.

- **Alignment Decision:**
  - For numbers, right alignment is commonly applied, except when nested or otherwise specified.
- **Integration with Data Grid:**
  - Formats are applied before insertion into grid cells, adjusting the raw values into a presentation-ready state using the rules and settings described above.
