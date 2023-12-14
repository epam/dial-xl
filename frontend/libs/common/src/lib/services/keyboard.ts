import { IMouseEvent } from 'monaco-editor';

export enum KeyboardCode {
  One = 'Digit1',
  Two = 'Digit2',
  Three = 'Digit3',
  Four = 'Digit4',
  Five = 'Digit5',
  Six = 'Digit6',
  Zero = 'Digit0',
  Space = ' ',
  Shift = 'Shift',
  Ctrl = 'Ctrl',
  Command = 'Command',
  Alt = 'Alt',
  KeyP = 'KeyP',
  Delete = 'Delete',
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
  F2 = 'F2',
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
