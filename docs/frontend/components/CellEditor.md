
# Cell Editor

The **Cell Editor** component enabling users to edit cell content, including values, formulas, overrides, totals, etc. or rename entities like table and field.

## Table of Contents

- [Opening the Cell Editor](#opening-the-cell-editor)
    - [Methods to Open the Cell Editor](#methods-to-open-the-cell-editor)
    - [Cell types](#cell-types)
    - [Determining Cell Editor Mode and Initial Value](#determining-cell-editor-mode-and-initial-value)
    - [Error Display Conditions](#error-display-conditions)
- [Edit Modes](#edit-modes)
    - [Available Edit Modes](#available-edit-modes)
    - [Auto Switching Edit Mode](#auto-switching-edit-mode)
- [Switch Edit Mode Hint](#switch-edit-mode-hint)
- [Point-and-Click Mode](#point-and-click-mode)
- [Complete edit](#complete-edit)
    - [Closing Scenarios](#closing-scenarios)
    - [Cell Editor Submit](#cell-editor-submit)
- [Minor Features](#minor-features)

## Opening the Cell Editor

The Cell Editor can be opened through various user interactions, depending on the context of the cell and the desired action.

### Methods to Open the Cell Editor

-  **Double-Clicking a Cell**: Users can double-click on a cell to open the Cell Editor for editing.

-  **Keyboard Shortcuts**:

    -   **Edit Formula Shortcut**: Pressing a key combination `Ctrl + F2` opens the Cell Editor to edit the cell's formula.
    -   **Rename Shortcut**: Pressing a `F2` allows the user to rename a table or field header. Also it can edit override of the table cell.
-  **Typing into a Cell**: When a cell is selected, typing any printable character opens the Cell Editor with that character as the initial input.

-  **Programmatic Opening**: The Cell Editor can be opened programmatically by the application, such as when a user typing on the formula bar.
- **Context menu**: The Cell Editor can be opened programmatically clicking on the related items in the context menu.

### Cell Types

-   **Table Header**: Displays the **table name**. Users can **rename** table header cells.
-   **Field Header**: Displays the **field name**. Users can **rename the field** or **edit the field's expression**.
-   **Total Cell**: Displays the **total value**, if it exists. Users can **add** or **edit** the total expression.
-   **Table Cell**: Displays a **value within the table**. Users have several options:
    -   **Edit the field expression** for the entire field.
    -   **Add an override** if there is no existing override in the cell.
    -   **Edit an existing override** for the cell.
-   **Empty Cell**: A cell that **does not belong to any table**. Users can **add a new table** while editing this cell.


### Determining Cell Editor Mode and Initial Value

When opening the cell editor, the system should determine the appropriate **edit mode** and **initial value** based on the properties of the selected cell and the options provided. The following logic should be applied:

**Initial value** for the start it can be a user input or value from the formula bar in case the cell editor opened explicitly.

#### 1. Table Headers
-   **Edit Mode**:
    - If the cell is a **table header**:
    - If cell editor opened explicitly from the formula bar, set the edit mode to **`'Edit Dim Expression'`**.
    - Otherwise, set the edit mode to **`'Rename Table'`**.
-   **Initial Value**:
    - For `'Rename Table'` mode:
    - If cell editor opens with **rename shortcut** set the initial value to the unescaped table name.
    - Otherwise, keep the initial value as is.
    - For `'Edit Dim Expression''` mode it will be a field expression.

#### 2. Table Field Headers

-   **Edit Mode**:
    - If cell editor opens with **rename shortcut**, set the edit mode to **`'Rename Field'`**.
    - If  cell editor opens with **edit formula shortcut** or opened explicitly form the formula bar, set the edit mode to **`'Edit Field Expression'`**.
    - Otherwise if cell editor opens with typing key:
        - If the value is `'='`, set the edit mode to **`'Edit Field Expression'`**.
        - Otherwise, set it to **`'Rename Field'`**.
-   **Initial Value**:
    - For `'Rename Field'` mode:
    - Set the initial value to the unescaped field name.
        - For `'Edit Field Expression'` mode:
    - Use initial cell value or use the field's expression.

#### 3. Totals

-   **Edit Mode**:
    - If the cell is a `Total Cell`, set the edit mode to **`'Add Total'`** or  **`'Edit Total'`** depending on whether there is any value in this cell
-   **Initial Value**:
    - Set the initial value to the existing total expression prefixed with `'='` if available; otherwise, set it to `'='`.

#### 4. Overrides

-   **Edit Mode**:
    - Only for table value cell.
    - Can be opened by typing, double click, selecting 'Edit Cell' context menu item, start editing by formula bar, switch already opened cell editor's mode.
    - Set the edit mode to **`'Edit Override'`** or  **`'Add Override'`** (depending on whether cell already have an override).
-   **Initial Value**:
    - For `'Add Override'` mode: User provided initial value, existing override value, field expression starting with '=', empty string.
    - For `'Edit Override'` mode: User provided initial value, existing override value, cell's current value

#### 5. Table Cells

When a user interacts with a **table cell**, the system must decide whether to enter **expression editing mode** based on specific conditions.

-   **Cell Location**: The cell is part of a table but is neither a table header nor a field header.

-   **No Other Overrides**: There are no additional overrides affecting the cell.

-   **Editor State**: The editor is not already open for renaming purposes.

-   **Formula Input**: The user's input represents a formula (e.g., starts with an equal sign) or the cell contains a formula by context.


#### Determining the Initial Value:

-   **User Input**: If the user has provided an initial value (e.g., by typing before the editor opens), use this value.

-   **Cell's Existing Value**: If no initial value is provided, use the cell's existing formula or expression, formatted appropriately as a formula if necessary.

#### 6. Default Mode

- If none of the above conditions apply:
- Set the edit mode to **`'Empty Cell'`**.
- Set the initial value to cell initial value or an empty string.

### Error Display Conditions

An error message should be displayed, and the Cell Editor should not open, under the following conditions:

### 1. Attempting to Override a Key Field

-   **Condition**: The cell belongs to a field that is designated as a **key field**.
-   **Message**: 'Override of the key field is not supported.'

### 2. Attempting to Override a Field of a Complex Type

-   **Condition**: The cell's field is of a **complex data type** (one of: INPUT,  PERIOD_SERIES,  PERIOD_SERIES_POINT, TABLE)
-   **Message**: 'Override of the field with complex type is not supported.'

### 3. Attempting to Override a Filtered or Sorted Field

-   **Condition**:
    - The cell's field is **filtered**, **sorted**, or **used in sorting**.
    - The table **does not have keys**.
    - The table **is not a manual table**.
-   **Message**: 'Changing sort/filter fields are not allowed for table without key. Please assign keys.'

### Additional Conditions

- These error checks are applied only when the cell is **not**:
- A **table field** (i.e., not a field header).
- A **total cell** (i.e., not a cell designated for totals).

## Edit Modes

### Available Edit Modes

The Cell Editor operates in different modes depending on the context and the user's action. Each mode determines the type of editing allowed and the initial value displayed.

-   **Rename Table (`rename_table`)**: Renaming a table header.
-   **Rename Field (`rename_field`)**: Renaming a field header.
-   **Edit Field Expression (`edit_field_expression`)**: Editing a field's expression.
-   **Edit Cell Expression (`edit_cell_expression`)**: Editing a cell's expression.
-   **Edit Complex Field (`edit_complex_field`)**: Editing field expression only for the complex field type.
-   **Edit Dynamic Field Header (`edit_dynamic_field_header`)**: Editing dynamic [*] field expression.
-   **Add Override (`add_override`)**: Adding an override value or expression to a cell.
-   **Edit Override (`edit_override`)**: Editing an existing override in a cell.
-   **Add Total (`add_total`)**: Adding a total expression to a total cell.
-   **Edit Total (`edit_total`)**: Editing an existing total expression.
-   **Empty Cell (`empty_cell`)**: Entering a value or expression into an empty cell.

### Auto Switching Edit Mode

When a user changes the content in the cell editor, the system can automatically switch the edit mode, following these rules:

-  **Renaming Modes**:

    -   **Switch to Field Expression Editing**:
        - If the current edit mode is `Rename Field` and the new input starts with an equal sign (`=`), switch the edit mode to `Edit Field Expression`.
        - Update the dotted selection visibility to reflect the new mode.

-  **Empty Cell Editing**:

    - If editing an empty cell (*cell that doesn't belong to any table*) and the new input represents a formula:
        - Update the dotted selection visibility to indicate that the cell is now in field formula editing mode.

-  **Type Change Handling (No Other Overrides Exist)**:

    -   **From Override to Expression**:
        - If currently adding/editing an override and the new input changes from a value to a formula:
            - Switch the edit mode to `Edit Cell Expression`.
            - Update the dotted selection visibility accordingly.
    -   **From Expression to Override**:
        - If currently editing an expression and the new input changes from a formula to a value, and the cell's field is neither sorted nor filtered:
            - Determine the next edit mode:
                - If the cell is already an override, switch to `Edit Override`.
                - If not, switch to `Add Override`.
            - Update the dotted selection visibility to reflect the new mode.
-  **General Conditions**:

    - These updates should only occur if there is a change in the type of content (from value to formula or vice versa) and there are no other overrides in the same field.
    - The system should not perform these updates if the cell editor was opened explicitly in value mode via the formula bar.


## Switch Edit Mode Hint

-   **Overview**: Introduce a hint above the cell editor with functionality to assist users in editing and navigating between different modes efficiently.

-   **Visibility**:

    - The hint is  **not** displayed when the selected cell is empty.
    - When applicable, the hint can display either a **single mode** or **two modes**: the current mode and a secondary mode.
-   **Mode Switching**:

    - Users can switch between modes by clicking on the **secondary mode** displayed in the tooltip or by pressing the associated **keyboard shortcut**.
    - The tooltip should display the value relevant to the next mode when switching.
-   **Closing the Tooltip**:

    - A close button should be available on the right side of the hint, allowing users to hide it when desired.

#### Supported Modes:

-   **Single Mode**:
    - Rename table (F2)
    - Edit field
    - Edit total
    - Add total

-   **Multiple Modes**:
    - Rename field (F2). <-> Edit field (ALT+F2).
    - Edit field (ALT+F2). <-> Rename field (F2).
    - Edit field (Alt+F2). <-> Edit cell (F2).
    - Edit cell (F2). <-> Edit field (Alt+F2).

## Point-and-Click Mode

**Point-and-Click Mode** in the cell editor is to enhance formula editing by allowing users to insert cell references or values by clicking, providing a more intuitive and efficient way to build formulas.

-  **Activation of Point-and-Click Mode**:

    -   **Start Condition**:
        - The mode activates when the user types symbols (e.g., +, -, *, /, MOD, ^, AND, OR, NOT, -, <, >, ==, ,<=, ,>=, <>) in the formula editor.
    -   **End Condition**:
        - The mode deactivates when the user types regular text or characters that are not part of special symbols list.
        - Exiting the formula editing context also stops point-and-click mode.

-  **Inserting Values via Click**:

    -   **On User Click**:
        - When in point-and-click mode, allow the user to click on cells or UI elements (e.g. Project Tree items) to insert their references or values into the formula at the current cursor position.
        - Update the formula by inserting the selected value, adjusting for any previously inserted values.
        - After insertion, maintain focus on the formula editor to enable continuous editing.

## Complete edit

### Closing Scenarios

#### 1. On Blur (Losing Focus)

-   **Condition**: The Cell Editor loses focus because the user clicks outside the editor.
-   **Requirements**:
    - The closure should not occur if the editor loses focus due to interactions within related components:
    - focusing and working in the formula bar
    - point and click mode is active
    - some modal is open
    - switching edit modes via clicking on the cell editor tooltip
        - If appropriate, the editor should submit the current value before closing.

#### 2. Key Press Events

##### a. Pressing the Escape Key

-   **Condition**: The user presses the `Escape` key while the Cell Editor is focused.
-   **Requirements**:
    - The editor should discard any unsaved changes made during the current editing session.
    - The editor should restore the cell's original value if it was modified during editing.
    - The editor should close.

##### b. Enter Key / Ctrl + S

-   **Condition**: The user presses the `Enter` key while editing.
-   **Requirements**:
    - The editor should save the current value.
    - The editor should close after saving.
    - The selection should move to the cell below the current cell.

##### c. Tab Key

-   **Condition**: The user presses the `Tab` key while editing.
-   **Requirements**:
    - The editor should save the current value.
    - The editor should close after saving.
    - The selection should move to the next cell to the right.
    - If edit manual table cell:
    - If cell is in the last column of the table - selection should move to the first column of the next table row
    - If it is a last row - new table row will be created

##### d. Arrow Keys

-   **Condition**: The user presses any of the arrow keys (`Left`, `Right`, `Up`, `Down`).
-   **Requirements**:
    - Value in the editor is a formula ('=' is present in the value).
    - The editor was opened by typing a character.
    - The editor should close after saving.
    - The selection should move in the direction of the arrow key pressed.
    - Otherwise, the arrow keys should navigate within the editor content and not close the editor.

##### e. Ctrl + Enter

-   **Condition**: The user presses `Ctrl + Enter` while editing.
-   **Requirements**:
    - The editor should save the current value.
    - The editor should close after saving.
    - The selection should remain on the current cell without moving.

#### 3. Programmatic Closure

-   **Condition**: The application instructs the editor to close programmatically (e.g., when save/cancel was happened in the formula bar).
-   **Requirements**:
    - The editor should close immediately upon receiving the instruction.
    - The editor should perform necessary cleanup and state restoration.

#### State Management After Closure

-   **Selection Restoration**:
    - The cell selection should be restored or updated appropriately after the editor closes.
-   **Value Restoration**:
    - If editing was canceled, the original cell value should be restored.
-   **Visual Indicators**:
    - Any visual elements (e.g., dotted selections, highlights) used during editing should be removed.
    -
### Cell Editor Submit

The system must handle the submission of values entered in the cell editor, applying different actions based on the context of the cell.

#### 1. Submitting Values in Empty Cells

When a user enters a value into an empty cell (a cell not part of any table), the system should process the input based on its type and the surrounding cells.

-   **Create Dimension Tables**:
    -   **Multi-Dimensional Formula**:  
        If the input value represents a **multi-dimensional formula** (it is more than 1 ':' symbol in value), the system should create a new **dimension table** at the specified cell location.

    -   **Single-Dimensional Formula**:  
        If the input value represents a **single-dimensional formula** (it is single ':' symbol in value), create a dimension table using the provided formula.

    - **Single Value Manual Table**
      If the input represents constant (number or string, e.g. 42, 'text')

    - **Table from formula**

      If the input represents a **formula**, the type of table created will depend on how the API interprets that formula. The possibilities include:

        -   **Manual Table with a Single Formula Value**: For inputs like `=TEXT(10)`, a manual table containing the single formula result will be created.

        -   **Dimensional Table with Provided Formula**: For inputs such as `=RANGE(10)`, the system will generate a dimensional table based on the formula provided.

        -   **Dimensional Table with Additional Fields**: For inputs like `=INPUT("%your_input_file%")`, a dimensional table will be created that includes other fields derived from the formula's output.


-   **Add Fields or Rows to Adjacent Tables**:

    -   **Add a New Field**:
        - If there is an adjacent table to the **left** or **above** the empty cell, and the table's orientation is appropriate:
            - Add a new field to the table with the entered value.
            - If the adjacent cell is a field header or table header, or if the value is a formula, directly add the field.
    -   **Add a New Row**:
        - If there is an adjacent table to the **left** or **above** the empty cell, and the table's orientation allows:
            - Add a new row to the table with the entered value as override for this field and other cells are empty.
-   **Rename Hidden Fields or Tables**:

    - If the empty cell is adjacent to a table with hidden headers (either **below** or **to the right**):
        -   **Rename a Field**:
            - If the adjacent cell represents a hidden field header, rename the field using the entered value.
        -   **Rename a Table**:
            - If the adjacent cell represents a hidden table name header, rename the table using the entered value.
-   **Create Single-Value Tables**:

    - If there is **no adjacent table** and the entered value is a **constant** (not a formula):
        - Create a new **single-value manual table** at the specified cell location.
-   **Create Dimension Tables from Formulas**:

    - If there is **no adjacent table** and the entered value is a **formula**:
        - Create a new **dimension table** using the formula at the specified cell location.

#### 2. Submitting Value in Existing Cell

When a user edits a cell that is part of an existing table or has a specific edit mode, the system should perform actions based on the current edit mode.

-   **Rename Table**:
    - Rename the table to the new value entered by the user.

-   **Rename Field**:
    - Rename the field within the table to the new value.

-   **Edit Dimension Expression**:
    - Update the expression of the dimension field with the new value, if a dimension field name is provided.

-   **Edit Complex Field**:
-   **Edit Dynamic Field Header**:
    - Update the field's expression directly with the new value.

-   **Edit Field or Cell Expression**:

    - If the cell has an **override**:
        - Remove the existing override and update the field's expression with the new value.
    - If there is **no override**:
        - Update the field's expression directly with the new value.

-   **Add Override**:
    - Add a new override at the specified cell location with the new value.
    - If the value is a formula, process it accordingly.
    -   **Validations**:
    - Ensure the field is **not a key field**.
    - Ensure the field is **not a complex type**.
    - Ensure the cell is **eligible** for an override (e.g., not filtered or sorted in a way that disallows overrides).

-   **Edit Override** :
    - Update the existing override at the specified cell location with the new value.
    - If the value is a formula, process it accordingly.

-   **Add Total Expression**:
    - Add a new total expression to the table with the entered value.
-   **Edit Total Expression**:
    - Update the existing total expression of the table with the new value.


## Minor Features

### 1. Disable Monaco Editor Hints During Table or Field Renaming

-   **Description**: When a user is renaming a table or a field, the Monaco editor's code hints and suggestions should be disabled.