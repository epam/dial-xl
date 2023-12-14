import { isCommandKey, KeyboardCode } from './keyboard';
import { getOS, OS } from './platform';

export type ShortcutHandlersMap = {
  [k in Shortcut]: (event: KeyboardEvent) => void;
};

type ShortcutMap = {
  [k in Shortcut]: KeyboardCode[] | KeyboardCode[][];
};

const isMac = () => getOS() === OS.Mac;

export enum Shortcut {
  Copy = 'Copy',
  Paste = 'Paste',
  NewProject = 'NewProject',
  ToggleProjects = 'ToggleProjects',
  ToggleInputs = 'ToggleInputs',
  ToggleCodeEditor = 'ToggleCodeEditor',
  ToggleErrors = 'ToggleErrors',
  ToggleHistory = 'ToggleHistory',
  ToggleChat = 'ToggleChat',
  PageUp = 'PageUp',
  PageDown = 'PageDown',
  SelectAll = 'SelectAll',
  SelectRow = 'SelectRow',
  SelectColumn = 'SelectColumn',
  MoveUp = 'MoveUp',
  MoveDown = 'MoveDown',
  MoveLeft = 'MoveLeft',
  MoveRight = 'MoveRight',
  RangeSelectionUp = 'RangeSelectionUp',
  RangeSelectionDown = 'RangeSelectionDown',
  RangeSelectionLeft = 'RangeSelectionLeft',
  RangeSelectionRight = 'RangeSelectionRight',
  ExtendRangeSelectionUp = 'ExtendRangeSelectionUp',
  ExtendRangeSelectionDown = 'ExtendRangeSelectionDown',
  ExtendRangeSelectionLeft = 'ExtendRangeSelectionLeft',
  ExtendRangeSelectionRight = 'ExtendRangeSelectionRight',
  UndoAction = 'UndoAction',
  RedoAction = 'RedoAction',
  Delete = 'Delete',
  ZoomIn = 'ZoomIn',
  ZoomOut = 'ZoomOut',
  ZoomReset = 'ZoomReset',
  Rename = 'Rename',
  EditExpression = 'EditExpression',
  SwapFieldsLeft = 'SwapFieldsLeft',
  SwapFieldsRight = 'SwapFieldsRight',
  ContextMenu = 'ContextMenu',
  SearchWindow = 'SearchWindow',
  MoveSelectionNextAvailableUp = 'MoveSelectionNextAvailableUp',
  MoveSelectionNextAvailableDown = 'MoveSelectionNextAvailableDown',
  MoveSelectionNextAvailableLeft = 'MoveSelectionNextAvailableLeft',
  MoveSelectionNextAvailableRight = 'MoveSelectionNextAvailableRight',
  MoveToSheetStart = 'MoveToSheetStart',
  MoveToSheetEnd = 'MoveToSheetEnd',
  MoveTabBackward = 'MoveTabBackward',
}

const shortcutMap: ShortcutMap = {
  [Shortcut.Copy]: [KeyboardCode.Command, KeyboardCode.C],
  [Shortcut.Paste]: [KeyboardCode.Command, KeyboardCode.V],
  [Shortcut.NewProject]: [KeyboardCode.Alt, KeyboardCode.KeyP],
  [Shortcut.ToggleProjects]: [KeyboardCode.Alt, KeyboardCode.One],
  [Shortcut.ToggleCodeEditor]: [KeyboardCode.Alt, KeyboardCode.Two],
  [Shortcut.ToggleInputs]: [KeyboardCode.Alt, KeyboardCode.Three],
  [Shortcut.ToggleErrors]: [KeyboardCode.Alt, KeyboardCode.Four],
  [Shortcut.ToggleHistory]: [KeyboardCode.Alt, KeyboardCode.Five],
  [Shortcut.ToggleChat]: [KeyboardCode.Alt, KeyboardCode.Six],
  [Shortcut.UndoAction]: [KeyboardCode.Command, KeyboardCode.Z],
  [Shortcut.RedoAction]: [
    [KeyboardCode.Command, KeyboardCode.Shift, KeyboardCode.Z],
    [KeyboardCode.Command, KeyboardCode.Y],
  ],
  [Shortcut.PageUp]: [KeyboardCode.PageUp],
  [Shortcut.PageDown]: [KeyboardCode.PageDown],
  [Shortcut.SelectAll]: [KeyboardCode.Command, KeyboardCode.A],
  [Shortcut.SelectRow]: [KeyboardCode.Shift, KeyboardCode.Space],
  [Shortcut.SelectColumn]: [KeyboardCode.Command, KeyboardCode.Space],
  [Shortcut.RangeSelectionUp]: [KeyboardCode.Shift, KeyboardCode.ArrowUp],
  [Shortcut.RangeSelectionDown]: [KeyboardCode.Shift, KeyboardCode.ArrowDown],
  [Shortcut.RangeSelectionRight]: [KeyboardCode.Shift, KeyboardCode.ArrowRight],
  [Shortcut.RangeSelectionLeft]: [KeyboardCode.Shift, KeyboardCode.ArrowLeft],
  [Shortcut.ExtendRangeSelectionUp]: [
    KeyboardCode.Command,
    KeyboardCode.Shift,
    KeyboardCode.ArrowUp,
  ],
  [Shortcut.ExtendRangeSelectionDown]: [
    KeyboardCode.Command,
    KeyboardCode.Shift,
    KeyboardCode.ArrowDown,
  ],
  [Shortcut.ExtendRangeSelectionRight]: [
    KeyboardCode.Command,
    KeyboardCode.Shift,
    KeyboardCode.ArrowRight,
  ],
  [Shortcut.ExtendRangeSelectionLeft]: [
    KeyboardCode.Command,
    KeyboardCode.Shift,
    KeyboardCode.ArrowLeft,
  ],
  [Shortcut.MoveUp]: [KeyboardCode.ArrowUp],
  [Shortcut.MoveDown]: [KeyboardCode.ArrowDown],
  [Shortcut.MoveLeft]: [KeyboardCode.ArrowLeft],
  [Shortcut.MoveRight]: [KeyboardCode.ArrowRight],
  [Shortcut.Delete]: [KeyboardCode.Delete],
  [Shortcut.ZoomIn]: [
    [KeyboardCode.Command, KeyboardCode.Equal],
    [KeyboardCode.Command, KeyboardCode.Plus],
  ],
  [Shortcut.ZoomOut]: [KeyboardCode.Command, KeyboardCode.Minus],
  [Shortcut.ZoomReset]: [KeyboardCode.Command, KeyboardCode.Zero],
  [Shortcut.Rename]: [KeyboardCode.Alt, KeyboardCode.F2],
  [Shortcut.EditExpression]: [KeyboardCode.F2],
  [Shortcut.SwapFieldsLeft]: [
    KeyboardCode.Shift,
    KeyboardCode.Alt,
    KeyboardCode.ArrowLeft,
  ],
  [Shortcut.SwapFieldsRight]: [
    KeyboardCode.Shift,
    KeyboardCode.Alt,
    KeyboardCode.ArrowRight,
  ],
  [Shortcut.ContextMenu]: [KeyboardCode.ContextMenu],

  [Shortcut.SearchWindow]: [
    KeyboardCode.Command,
    KeyboardCode.Shift,
    KeyboardCode.F,
  ],
  [Shortcut.MoveSelectionNextAvailableUp]: [
    KeyboardCode.Command,
    KeyboardCode.ArrowUp,
  ],
  [Shortcut.MoveSelectionNextAvailableDown]: [
    KeyboardCode.Command,
    KeyboardCode.ArrowDown,
  ],
  [Shortcut.MoveSelectionNextAvailableLeft]: [
    KeyboardCode.Command,
    KeyboardCode.ArrowLeft,
  ],
  [Shortcut.MoveSelectionNextAvailableRight]: [
    KeyboardCode.Command,
    KeyboardCode.ArrowRight,
  ],
  [Shortcut.MoveToSheetStart]: [KeyboardCode.Command, KeyboardCode.Home],
  [Shortcut.MoveToSheetEnd]: [KeyboardCode.Command, KeyboardCode.End],
  [Shortcut.MoveTabBackward]: [KeyboardCode.Shift, KeyboardCode.Tab],
};

const keyboardCodeToString = (key: KeyboardCode): string => {
  switch (key) {
    case KeyboardCode.Shift:
      return isMac() ? '⇧' : 'Shift';
    case KeyboardCode.Space:
      return '␣';
    case KeyboardCode.Ctrl:
      return 'Ctrl';
    case KeyboardCode.Command:
      return isMac() ? '⌘' : KeyboardCode.Ctrl;
    case KeyboardCode.Alt:
      return isMac() ? '⌥' : 'Alt';
    case KeyboardCode.ArrowUp:
      return '↑';
    case KeyboardCode.ArrowDown:
      return '↓';
    case KeyboardCode.ArrowLeft:
      return '←';
    case KeyboardCode.ArrowRight:
      return '→';
  }

  return key.toUpperCase().replace(/(KEY|DIGIT)/, '');
};

function getLabel(shortcut: Shortcut) {
  const hasMultipleOptions = Array.isArray(shortcutMap[shortcut][0]);
  const keys = (
    hasMultipleOptions ? shortcutMap[shortcut][0] : shortcutMap[shortcut]
  ) as KeyboardCode[];

  return keys.map(keyboardCodeToString).join('+');
}

function is(shortcut: Shortcut, event?: KeyboardEvent) {
  if (!event) return false;

  const hasMultipleOptions = Array.isArray(shortcutMap[shortcut][0]);

  if (hasMultipleOptions) {
    return (shortcutMap[shortcut] as KeyboardCode[][]).some(
      (option: KeyboardCode[]) =>
        option.every((key: KeyboardCode) => checkKey(key, event))
    );
  }

  return (shortcutMap[shortcut] as KeyboardCode[]).every((key: KeyboardCode) =>
    checkKey(key, event)
  );
}

function checkKey(key: KeyboardCode, event: KeyboardEvent) {
  switch (key) {
    case KeyboardCode.Ctrl:
    case KeyboardCode.Command:
      return isCommandKey(event);
    case KeyboardCode.Shift:
      return event.shiftKey;
    case KeyboardCode.Alt:
      return event.altKey;
  }

  return (
    key === event.key.toLowerCase() || key === event.key || key === event.code
  );
}

export const shortcutApi = {
  is,
  getLabel,
};
