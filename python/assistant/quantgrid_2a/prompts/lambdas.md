## Lambdas

QuantGrid uses "lambda" to denote independent anonymous function.

Lambda is defined using the following syntax: `(value_one: T, value_two: U) => { <expression> }`.

The section in round brackets declares parameters to be captured by lambda. In case no values are captured, round
brackets should be empty: `() => { <expression> }`. Curly braces are always required.

It is crucial to respect lambda parameters, because only the following values can be used inside the lambda:

1. Lambda captured parameters. That means, it is impossible to reference outer lambda parameters inside nested lambda.
2. Tables created in global user workspace (reference by using table name).
3. Row values passed to current formula invocation (reference by using field name).

Lambdas correct usage is very important, because some QuantGrid functions expect lambdas with specific parameters.

### Lambdas Concept and Usage Diagram

```ascii
Syntax:
-------
(param1: T, param2: U) => { expression }

        ^             ^            ^
        |             |            |
    Parameters    Arrow       Expression
                 Operator    (in curly braces)

Examples:
---------
1. No parameters:    () => { 5 + 3 }
2. One parameter:    (x: number) => { x * 2 }
3. Multiple params:  (a: number, b: string) => { func(a) + b }

Lambda Scope and Accessibility:
-------------------------------

    +---------------------------------------------------+
    |                  Global Workspace                 |
    |  +---------------------------------------------+  |
    |  |               Lambda Function               |  |
    |  |  +---------------------------------------+  |  |
    |  |  |        Accessible in Lambda           |  |  |
    |  |  |  +-------------------------------+    |  |  |
    |  |  |  | 1. Lambda Parameters          |    |  |  |
    |  |  |  | 2. Global Workspace Tables    |    |  |  |
    |  |  |  | 3. Current Formula Row Values |    |  |  |
    |  |  |  +-------------------------------+    |  |  |
    |  |  |                                       |  |  |
    |  |  | Not Accessible: Outer Lambda Params   |  |  |
    |  |  +---------------------------------------+  |  |
    |  +---------------------------------------------+  |
    +---------------------------------------------------+

Usage in QuantGrid Functions:
-----------------------------

Function: some_array_function(array: array<T>, lambda: (T) => U) => array<U>

    Input Array        Lambda Function       Output Array
    +-----------+     +---------------+     +-----------+
    | 1, 2, 3, 4 | --> | (x) => x * 2  | --> | 2, 4, 6, 8 |
    +-----------+     +---------------+     +-----------+

Example:
some_array_function({1, 2, 3, 4}, (x: number) => { x * 2 })

Nested Lambdas and Scope:
-------------------------

Outer Lambda:
+--------------------------------------------------+
| (x: number) => {                                 |
|   ...                                            |
|   some_function(                                 |
|     Inner Lambda:                                |
|     +--------------------------------------------+
|     | (y: number) => {                           |
|     |   y * 2  # Can't access outer param 'x'    |
|     | }                                          |
|     +--------------------------------------------+
|   )                                              |
| }                                                |
+--------------------------------------------------+

Key Points:
-----------
1. Lambdas are anonymous functions
2. Syntax: (params) => { expression }
3. Curly braces are always required
4. Can only access:
   - Lambda parameters
   - Global workspace tables
   - Current formula row values
5. Cannot access outer lambda parameters in nested lambdas
6. Used in various QuantGrid functions
7. Respect parameter types as expected by QuantGrid functions
```