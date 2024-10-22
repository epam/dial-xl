import { Shortcut, shortcutApi } from '@frontend/common';

export const shortcuts = [
  {
    key: '1',
    shortcut: shortcutApi.getLabel(Shortcut.PageUp),
    description: 'Move screen up',
  },
  {
    key: '2',
    shortcut: shortcutApi.getLabel(Shortcut.PageDown),
    description: 'Move screen down',
  },
  {
    key: '3',
    shortcut: shortcutApi.getLabel(Shortcut.SelectAll),
    description: 'Select table',
  },
  {
    key: '4',
    shortcut: shortcutApi.getLabel(Shortcut.SelectRow),
    description: 'Select an entire row',
  },
  {
    key: '5',
    shortcut: shortcutApi.getLabel(Shortcut.SelectColumn),
    description: 'Select an entire column',
  },

  {
    key: '6',
    shortcut: shortcutApi.getLabel(Shortcut.MoveUp),
    description: 'Move up one cell',
  },
  {
    key: '7',
    shortcut: shortcutApi.getLabel(Shortcut.MoveDown),
    description: 'Move down one cell',
  },
  {
    key: '8',
    shortcut: shortcutApi.getLabel(Shortcut.MoveLeft),
    description: 'Move left one cell',
  },
  {
    key: '9',
    shortcut: shortcutApi.getLabel(Shortcut.MoveRight),
    description: 'Move right one cell',
  },
  {
    key: '10',
    shortcut: `${shortcutApi.getLabel(
      Shortcut.RangeSelectionUp
    )} or ${shortcutApi.getLabel(
      Shortcut.RangeSelectionDown
    )} or ${shortcutApi.getLabel(
      Shortcut.RangeSelectionLeft
    )} or ${shortcutApi.getLabel(Shortcut.RangeSelectionRight)}`,
    description: 'Select a range of cells',
  },
  {
    key: '11',
    shortcut: `${shortcutApi.getLabel(
      Shortcut.MoveSelectionNextAvailableUp
    )} or ${shortcutApi.getLabel(
      Shortcut.MoveSelectionNextAvailableDown
    )} or ${shortcutApi.getLabel(
      Shortcut.MoveSelectionNextAvailableLeft
    )} or ${shortcutApi.getLabel(Shortcut.MoveSelectionNextAvailableRight)}`,
    description: 'Move to the edge of the current data region',
  },
  {
    key: '12',
    shortcut: `${shortcutApi.getLabel(
      Shortcut.ExtendRangeSelectionUp
    )} or ${shortcutApi.getLabel(
      Shortcut.ExtendRangeSelectionDown
    )} or ${shortcutApi.getLabel(
      Shortcut.ExtendRangeSelectionLeft
    )} or ${shortcutApi.getLabel(Shortcut.ExtendRangeSelectionRight)}`,
    description: 'Extends selection to the last cell of the used range',
  },
  {
    key: '13',
    shortcut: shortcutApi.getLabel(Shortcut.Copy),
    description: 'Copy selected cells',
  },
  {
    key: '14',
    shortcut: shortcutApi.getLabel(Shortcut.Paste),
    description: 'Paste copied cells',
  },
  {
    key: '15',
    shortcut: shortcutApi.getLabel(Shortcut.NewProject),
    description: 'Create a project',
  },
  {
    key: '16',
    shortcut: shortcutApi.getLabel(Shortcut.ZoomIn),
    description: 'Zoom spreadsheet in',
  },
  {
    key: '17',
    shortcut: shortcutApi.getLabel(Shortcut.ZoomOut),
    description: 'Zoom spreadsheet out',
  },
  {
    key: '18',
    shortcut: shortcutApi.getLabel(Shortcut.ZoomReset),
    description: 'Reset spreadsheet zoom',
  },
  {
    key: '19',
    shortcut: shortcutApi.getLabel(Shortcut.Rename),
    description: 'Rename table or field',
  },
  {
    key: '20',
    shortcut: shortcutApi.getLabel(Shortcut.EditExpression),
    description: 'Edit field expression',
  },
  {
    key: '21',
    shortcut: shortcutApi.getLabel(Shortcut.SwapFieldsLeft),
    description: 'Swap fields left',
  },
  {
    key: '22',
    shortcut: shortcutApi.getLabel(Shortcut.SwapFieldsRight),
    description: 'Swap fields right',
  },
  {
    key: '23',
    shortcut: 'Home',
    description: 'Go to the beginning of the spreadsheet',
  },
  {
    key: '24',
    shortcut: 'End',
    description: 'Go to the end of the spreadsheet',
  },
  {
    key: '25',
    shortcut: shortcutApi.getLabel(Shortcut.SearchWindow),
    description: 'Search',
  },
  {
    key: '26',
    shortcut: shortcutApi.getLabel(Shortcut.MoveToSheetStart),
    description: 'Move selection to the sheet start',
  },
  {
    key: '27',
    shortcut: shortcutApi.getLabel(Shortcut.MoveToSheetEnd),
    description: 'Move selection to the sheet end',
  },
];
