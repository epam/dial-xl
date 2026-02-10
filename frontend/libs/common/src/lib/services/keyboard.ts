import { IMouseEvent } from 'monaco-editor';

export enum KeyboardCode {
  One = 'Digit1',
  Two = 'Digit2',
  Three = 'Digit3',
  Four = 'Digit4',
  Five = 'Digit5',
  Six = 'Digit6',
  Seven = 'Digit7',
  Eight = 'Digit8',
  Zero = 'Digit0',
  Space = ' ',
  Shift = 'Shift',
  Ctrl = 'Ctrl',
  Command = 'Command',
  Alt = 'Alt',
  KeyP = 'KeyP',
  Delete = 'Delete',
  Backspace = 'Backspace',
  ArrowDown = 'ArrowDown',
  ArrowUp = 'ArrowUp',
  ArrowRight = 'ArrowRight',
  ArrowLeft = 'ArrowLeft',
  PageUp = 'PageUp',
  PageDown = 'PageDown',
  Equal = 'Equal',
  Plus = '+',
  Minus = 'Minus',
  A = 'KeyA',
  Z = 'KeyZ',
  C = 'KeyC',
  V = 'KeyV',
  Y = 'KeyY',
  F = 'KeyF',
  S = 'KeyS',
  F2 = 'F2',
  F10 = 'F10',
  Escape = 'Escape',
  ContextMenu = 'ContextMenu',
  Tab = 'Tab',
  Enter = 'Enter',
  Home = 'Home',
  End = 'End',
}

export function isCommandKey(event: KeyboardEvent | IMouseEvent) {
  return event.metaKey || event.ctrlKey;
}

export function shouldStopPropagation(
  event: KeyboardEvent | React.KeyboardEvent
) {
  const stopKeys = [
    KeyboardCode.Backspace,
    KeyboardCode.Delete,
    KeyboardCode.Enter,
    KeyboardCode.Tab,
    KeyboardCode.Home,
    KeyboardCode.End,
    KeyboardCode.ArrowUp,
    KeyboardCode.ArrowDown,
    KeyboardCode.ArrowLeft,
    KeyboardCode.ArrowRight,
  ];

  return (
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey ||
    stopKeys.includes(event.key as KeyboardCode)
  );
}
