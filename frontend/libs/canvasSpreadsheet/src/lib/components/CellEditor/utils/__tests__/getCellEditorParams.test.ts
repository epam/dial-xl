import { naExpression } from '@frontend/parser';

import { GridCell } from '../../../../types';
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
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      value: '1000000000000',
    },
  },
  {
    name: [
      'No field formula',
      'No other field overrides',
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      value: '1000000000000',
    },
  },
  {
    name: [
      'No field formula',
      'No other field overrides',
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      value: '1000000000000',
    },
  },
  {
    name: [
      'No field formula',
      'Has other field overrides',
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      value: '1000000000000',
    },
  },
  {
    name: [
      'No field formula',
      'Has other field overrides',
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      value: '1000000000000',
    },
  },
  {
    name: [
      'Has field formula',
      'No other field overrides',
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      value: '1000000000000',
    },
  },
  {
    name: [
      'Has field formula',
      'No other field overrides',
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      value: '1000000000000',
    },
  },
  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      value: '1000000000000',
    },
  },
  {
    name: [
      'Has field formula',
      'Has other field overrides',
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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
      'Simple string value override',
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
      'Simple number value override',
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
        value: '1.0E11',
        overrideValue: '1000000000000',
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

  // Special case
  // Manual table with single override
  {
    name: [
      'Has no formula',
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
        table: {
          isManual: true,
        },
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: true,
        overrideIndex: 123,
        value: '1',
        overrideValue: '1',
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

  // Complex field table cell
  {
    name: ['Has field formula', 'Complex field', 'Type value action'],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'T2(ROW())',
          type: 'TABLE_VALUE',
        } as any,
        isFieldHeader: false,
        isTableHeader: false,
        isOverride: false,
        value: '1',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: false,
        initialValue: '=T2(ROW())',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_complex_field' as GridCellEditorMode,
      value: '=T2(ROW())',
    },
  },

  // Dynamic field table header
  {
    name: ['Has field formula', 'Dynamic field', 'Table Header'],
    input: {
      cell: {
        col: 1,
        row: 1,
        field: {
          expression: 'Base.PIVOT($[N], VALUE($[N].SUM()))',
          isDynamic: true,
        } as any,
        isFieldHeader: true,
        isTableHeader: false,
        isOverride: false,
        value: '1',
      } as GridCell,
      options: {
        hasOtherOverrides: false,
        isEditExpressionShortcut: false,
        isAddOverride: false,
        isEditOverride: false,
        initialValue: '=Base.PIVOT($[N], VALUE($[N].SUM()))',
        onKeyDown: true,
        isRenameShortcut: false,
      } as GridCellEditorOpenOptions,
    },
    expectedResult: {
      editMode: 'edit_dynamic_field_header' as GridCellEditorMode,
      value: '=Base.PIVOT($[N], VALUE($[N].SUM()))',
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
