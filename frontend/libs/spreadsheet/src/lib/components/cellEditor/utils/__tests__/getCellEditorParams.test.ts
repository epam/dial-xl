import { GridCell } from '@frontend/common';
import { naExpression } from '@frontend/parser';

import { GridCellEditorMode, GridCellEditorOpenOptions } from '../..';
import { getCellEditorParams } from '../getCellEditorParams';

const testCases = [
  {
    name: [
      'No field formula',
      'No other field overrides',
      'No cell override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: '',
    },
  },
  {
    name: [
      'No field formula',
      'No other field overrides',
      'No cell override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: '',
    },
  },
  {
    name: [
      'No field formula',
      'No other field overrides',
      'No cell override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'No field formula',
      'No other field overrides',
      'No cell override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },

  {
    name: [
      'No field formula',
      'No other field overrides',
      'Simple value override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'Override value',
    },
  },
  {
    name: [
      'No field formula',
      'No other field overrides',
      'Simple value override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'Override value',
    },
  },
  {
    name: [
      'No field formula',
      'No other field overrides',
      'Simple value override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'No field formula',
      'No other field overrides',
      'Simple value override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },

  {
    name: [
      'No field formula',
      'No other field overrides',
      'Cell formula override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=FLOOR(1)',
    },
  },
  {
    name: [
      'No field formula',
      'No other field overrides',
      'Cell formula override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=FLOOR(1)',
    },
  },
  {
    name: [
      'No field formula',
      'No other field overrides',
      'Cell formula override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'No field formula',
      'No other field overrides',
      'Cell formula override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },

  {
    name: [
      'No field formula',
      'Has other field overrides',
      'No cell override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: '',
    },
  },
  {
    name: [
      'No field formula',
      'Has other field overrides',
      'No cell override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: '',
    },
  },
  {
    name: [
      'No field formula',
      'Has other field overrides',
      'No cell override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'No field formula',
      'Has other field overrides',
      'No cell override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },

  {
    name: [
      'No field formula',
      'Has other field overrides',
      'Simple value override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'Override value',
    },
  },
  {
    name: [
      'No field formula',
      'Has other field overrides',
      'Simple value override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'Override value',
    },
  },
  {
    name: [
      'No field formula',
      'Has other field overrides',
      'Simple value override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'No field formula',
      'Has other field overrides',
      'Simple value override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },

  {
    name: [
      'No field formula',
      'Has other field overrides',
      'Cell formula override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: '=FLOOR(1)',
    },
  },
  {
    name: [
      'No field formula',
      'Has other field overrides',
      'Cell formula override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: '=FLOOR(1)',
    },
  },
  {
    name: [
      'No field formula',
      'Has other field overrides',
      'Cell formula override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'No field formula',
      'Has other field overrides',
      'Cell formula override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: naExpression,
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },

  {
    name: [
      'Has field formula',
      'No other field overrides',
      'No cell override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=ABS(100)',
    },
  },
  {
    name: [
      'Has field formula',
      'No other field overrides',
      'No cell override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=ABS(100)',
    },
  },
  {
    name: [
      'Has field formula',
      'No other field overrides',
      'No cell override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'Has field formula',
      'No other field overrides',
      'No cell override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },

  {
    name: [
      'Has field formula',
      'No other field overrides',
      'Simple value override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'Override value',
    },
  },
  {
    name: [
      'Has field formula',
      'No other field overrides',
      'Simple value override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'Override value',
    },
  },
  {
    name: [
      'Has field formula',
      'No other field overrides',
      'Simple value override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'Has field formula',
      'No other field overrides',
      'Simple value override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },

  {
    name: [
      'Has field formula',
      'No other field overrides',
      'Cell formula override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=FLOOR(1)',
    },
  },
  {
    name: [
      'Has field formula',
      'No other field overrides',
      'Cell formula override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=FLOOR(1)',
    },
  },
  {
    name: [
      'Has field formula',
      'No other field overrides',
      'Cell formula override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'Has field formula',
      'No other field overrides',
      'Cell formula override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_cell_expression' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },

  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'No cell override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: '=ABS(100)',
    },
  },
  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'No cell override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: '=ABS(100)',
    },
  },
  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'No cell override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'No cell override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        overrideIndex: 123,
        overrideValue: undefined,
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: true,
        isEditOverride: false,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'add_override' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },

  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'Simple value override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'Override value',
    },
  },
  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'Simple value override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'Override value',
    },
  },
  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'Simple value override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'Simple value override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: 'Override value',
        overrideValue: '"Override value"',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },

  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'Cell formula override',
      'F2 action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: true,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: '=FLOOR(1)',
    },
  },
  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'Cell formula override',
      'DBL click action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: undefined,
        onKeyDown: false,
        isEditExpressionShortcut: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: '=FLOOR(1)',
    },
  },
  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'Cell formula override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: 'qwe',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: 'qwe',
    },
  },
  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'Cell formula override',
      'Type value action',
    ],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'ABS(100)',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: 'FLOOR(1)',
      } as GridCell,
      options: {
        hasOtherOverrides: true,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: true,
        initialValue: '=ABS(1)',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_override' as GridCellEditorMode,
      value: '=ABS(1)',
    },
  },
];

describe('getCellEditorParams', () => {
  testCases.forEach((test) => {
    it(test.name.join(' - '), () => {
      const input = test.input;

      const res = getCellEditorParams(input.cell, input.options);

      expect(res.value).toEqual(test.expectedResult.value);
      expect(res.editMode).toEqual(test.expectedResult.editMode);
    });
  });
});
