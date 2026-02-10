import { createContext, MutableRefObject } from 'react';

import {
  editor,
  SetCodeRefFunction,
  SetFocusRefFunction,
} from '@frontend/code-editor';

import {
  CurrentCell,
  EditorStyle,
  GridCellEditorMode,
  GridCellEditorOpenOptions,
} from '../types';

type CellEditorContextActions = {
  setIsOpen: (isOpen: boolean) => void;
  setOpenedExplicitly: (openedExplicitly: boolean) => void;
  setDimFieldName: (dimFieldName: string) => void;
  setCurrentCell: (currentCell: CurrentCell) => void;
  setEditedCalculatedCellValue: (editedCalculatedCellValue: string) => void;
  setEditMode: (editMode: GridCellEditorMode) => void;
  setEditorStyle: (
    editorStyle: EditorStyle | ((prev: EditorStyle) => EditorStyle)
  ) => void;
  setOpenedWithNextChar: (openedWithNextChar: string) => void;
  setCurrentTableName: (currentTableName: string) => void;
  setCurrentFieldName: (currentFieldName: string) => void;
  setCodeEditor: (codeEditor: editor.IStandaloneCodeEditor | undefined) => void;
  onCodeChange: (code: string) => void;
  restoreCellValue: () => void;
  displayCellEditor: (
    col: number,
    row: number,
    options: GridCellEditorOpenOptions
  ) => void;
  hide: () => void;
};

type CellEditorContextValues = {
  isOpen: boolean;
  openedExplicitly: boolean;
  dimFieldName: string;
  currentCell: CurrentCell;
  editedCalculatedCellValue: string;
  editMode: GridCellEditorMode;
  editorStyle: EditorStyle;
  openedWithNextChar: string;
  currentTableName: string;
  currentFieldName: string;
  codeEditor: editor.IStandaloneCodeEditor | undefined;
  saveOnArrowEnabled: boolean;

  isDottedSelection: MutableRefObject<boolean>;
  mouseOverSwitcherTooltip: MutableRefObject<boolean>;
  codeValue: MutableRefObject<string>;
  setCode: MutableRefObject<SetCodeRefFunction>;
  setFocus: MutableRefObject<SetFocusRefFunction>;
  ignoreScrollEvent: MutableRefObject<boolean>;
};

export const CellEditorContext = createContext<
  CellEditorContextActions & CellEditorContextValues
>({} as CellEditorContextActions & CellEditorContextValues);
