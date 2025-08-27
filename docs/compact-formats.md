### Use Cases
* Display numbers at a specified scale.
* Automatically compact numbers into a more comprehensible format.

The new formats should be applicable to existing compatible formats, such as currency, where appropriate.

<details>
  <summary>Original proposals</summary>

## Proposals
The current method of configuring formats is quite unreadable, and extending existing formats with new flags or parameters will only make readability worse.  
Therefore, it is preferable to change the way we define formatting parameters.

Here are a few proposals that do not require changes to the existing syntax:
1. **Dedicated decorators** for parameters that can apply to multiple formats. For example:
   * `!use_groups()` – for thousands separators.
   * `!decimal_places(2)` – for specifying the number of decimal places. Optionally, a second parameter could make decimal places optional.
   * `!compact()` – for the compact format described below.
   * `!scale('M')` – for a fixed scale. Supported scales: 'K', 'M', 'B', and 'E+/-{exponent}'.
2. **Named parameters:**
   * Alternating keys and values. For example:  
     `!format("number", "decimal_places", 2, "thousands_separator", 1)`
   * Serialized key-value pairs. For example:  
     `!format("number", "decimal_places=2", "thousands_separator=1")`

Language support for named parameters is not considered within the scope of this document, but intuitively, such an extension could make the language more complex.

### Scaling Format
The scaling format can be used as a standalone format or as a flag in other formats, such as number or currency.  
The scaling format accepts a scale parameter to round values accordingly. The rounded value is then prepended to the scale.

Examples:
* For scale = 'M' or 'E6':
    ```
    1 => 0M / 0E6
    123456789 => 123M / 123E6
    ```
* For scale = 'E-3':
    ```
    1 => 1000E-3
    123456789 => 123456789000E-3
    0.1 => 100E-3
    ```

### Compact Format (similar to [engineering notation](https://en.wikipedia.org/wiki/Engineering_notation))
As with scaling, the compact format can be used as a flag for other formats.  
By default, the compact format displays the smallest rounded integer part of a number (by absolute value) that is a multiple of 10^3x, where x is an integer.

Examples:
```
123 => 123
12345 => 12K
123456 => 123K
1234567 => 1M
0.1 => 100E-3
```

Other examples: 123K, 234M, 345B, 456e12, 123e-3, 234e-6, 356e-9

### Compact Format Alternative
For extended control, the integer part could be limited not to 3 digits, but to a specified number of significant digits.
Exponent formula: 3 * $\lceil (log_{10}(x) - sigDigits + 1) / 3 \rceil$ 

Examples:
* **Max significant digits = 4**
    ```
    123 => 123
    1234 => 1234
    12345 => 12.35K
    123456 => 123.5K
    1234567 => 1235K
    0.12345 => 123.5E-3
    ```
* **Max significant digits = 3**
    ```
    123 => 123
    1234 => 1.23K
    12345 => 12.3K
    123456 => 123K
    1234567 => 1.23M
    0.12345 => 123E-3
    ```
* **Max significant digits = 2**
    ```
    123 => ~~0.1K~~/0.12K
    1234 => 1.2K
    12345 => 12K
    123456 => ~~0.1M~~/0.12M
    1234567 => 1.2M
    0.12345 => ~~0.1~~/0.12
    ```

</details>

## AV's proposal

1. Support 3 different modes:
   - Compacted with fix precision: K/M/B  (Supported for Number/Percentage/Currency). 1 decimal max
   - Number of decimal places  (Supported for Number/Percentage/Currency/Scientific (number of decimal places in mantissa))
   - Number of significant digits (Supported for Number/Percentage/Currency/Scientific (number of digits in exp and mantissa combined))

2. Support "," for percentage.  Replace 0/1 with "," or absent

3. UI only has a single details button that allow to switch mode. Click opens drop down with text details.

4. Fix precision option has a second level: K/M/B
   In code, we have it as second parameter:
   - Positive numbers are decimal places
   - "K", "M", "B" means compacted with fixed precision
   - Negative number means total digit.


Examples:
- format("scientific", -5) - scientific with 5 total digits: 1.23e12, 1.2e123, 1.2e-123.
- format("scientific", 2) - scientific with exactly 2 decimals: 1.23e12, 1.20e123, 1.20e-123.
- format("scientific", "K") - format error.
- format("number", "K") - 123.1K, 123000000000K, 0.
- format("number", -3): 1234567890123 => 1e+13
- format("number", -4): 1234567890123 => 1.2e+13
- format("number", -3): 1e+123 => ~~#########~~ (proposed correction: return NA instead)

| original | format("number", -5) | format("number", -3) |
|----------|----------------------|----------------------|
| 1        | 1                    | 1                    |
| 12       | 12                   | 12                   |
| 123      | 123                  | 123                  |
| 1234     | 1234                 | 1.23K                |
| 12345    | 12345                | 12.3K                |
| 123456   | 123.46K              | 123K                 |
| 0.42     | 0.42                 | 0.42                 |
| 0.042    | 0.042                | 0.04                 |
| 0.0423   | 0.0423               | 0.04                 |
| 0.04235  | 0.0424               | 0.04                 |
| 1e-7     | 1e-7                 | 1e-7                 |
| 1.234E-7 | 1.234e-7             | 1.2e-7               |
| 1.23E+15 | 1.23E+15             | 1E+15                |
