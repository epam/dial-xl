import {
  createContext,
  JSX,
  MutableRefObject,
  PropsWithChildren,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  editor,
  SetCodeRefFunction,
  SetFocusRefFunction,
} from '@frontend/code-editor';
import {
  FormulaBarMode,
  GridCell,
  isCodeEditorMonacoInputFocused,
  isComplexType,
  overrideComplexFieldMessage,
  overrideFilteredOrSortedFieldMessage,
  overrideKeyFieldMessage,
  shouldNotOverrideCell,
} from '@frontend/common';

import { GridApi, GridCallbacks } from '../../types';
import { getCellContext } from '../../utils';
import {
  useCellEditorDottedSelection,
  useCellEditorMode,
  useCellEditorRestore,
  useCellEditorStyle,
} from './hooks';
import {
  CurrentCell,
  defaultStyle,
  EditorStyle,
  GridCellEditorMode,
  GridCellEditorOpenOptions,
} from './types';
import {
  getCellContextParams,
  getCellEditorParams,
  getCellEditorStyle,
  isCellEditorHasFocus,
  isSaveOnArrowEnabled,
  shouldSendUpdateEvent,
} from './utils';

type CellEditorContextProps = {
  apiRef: RefObject<GridApi>;
  gridCallbacksRef: RefObject<GridCallbacks>;
  formulaBarMode: FormulaBarMode;
  zoom: number;
};

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

export function CellEditorContextProvider({
  apiRef,
  children,
  gridCallbacksRef,
  formulaBarMode,
  zoom,
}: PropsWithChildren<CellEditorContextProps>): JSX.Element {
  // Editor Visibility and Mode
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [openedExplicitly, setOpenedExplicitly] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<GridCellEditorMode | null>(null);
  const [openedWithNextChar, setOpenedWithNextChar] = useState<string>('');
  const [saveOnArrowEnabled, setSaveOnArrowEnabled] = useState<boolean>(false);

  // Current Cell Information
  const [currentCell, setCurrentCell] = useState<CurrentCell | null>(null);
  const [currentTableName, setCurrentTableName] = useState<string>('');
  const [currentFieldName, setCurrentFieldName] = useState<string>('');

  // Editor Values and Styles
  const [editedCalculatedCellValue, setEditedCalculatedCellValue] =
    useState<string>('');
  const [dimFieldName, setDimFieldName] = useState<string>('');
  const [editorStyle, setEditorStyle] = useState<EditorStyle>(defaultStyle);

  // Code Editor References
  const [codeEditor, setCodeEditor] = useState<
    editor.IStandaloneCodeEditor | undefined
  >(undefined);
  const codeValue = useRef<string>('');
  const setCode = useRef<SetCodeRefFunction>(null);
  const setFocus = useRef<SetFocusRefFunction>(null);

  // Miscellaneous Refs
  const ignoreScrollEvent = useRef<boolean>(false);
  const isDottedSelection = useRef<boolean>(false);
  const mouseOverSwitcherTooltip = useRef<boolean>(false);

  const { restoreCellValue, restoreSelection } = useCellEditorRestore({
    apiRef,
    currentCell,
    editedCalculatedCellValue,
    setEditedCalculatedCellValue,
  });
  const { updateCellEditorStyle } = useCellEditorStyle({
    apiRef,
    currentCell,
    editorStyle,
    setEditorStyle,
    zoom,
  });

  const hide = useCallback(() => {
    restoreCellValue();
    restoreSelection();

    setIsOpen(false);
    setCurrentCell(null);
    setEditMode(null);
    setOpenedExplicitly(false);
    setOpenedWithNextChar('');
    setDimFieldName('');
    setCurrentTableName('');
    setCurrentFieldName('');
    codeValue.current = '';

    if (isDottedSelection.current) {
      apiRef.current?.hideDottedSelection();
      isDottedSelection.current = false;
    }

    gridCallbacksRef?.current?.onStopPointClick?.();

    // A way to remove focus from the formula bar, because focusing canvas element is not really working
    if (!isCodeEditorMonacoInputFocused()) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      document.activeElement?.blur();
    }
  }, [restoreCellValue, restoreSelection, gridCallbacksRef, apiRef]);

  const { updateDottedSelectionVisibility } = useCellEditorDottedSelection({
    apiRef,
    isDottedSelection,
  });

  const { updateEditModeOnCodeChange } = useCellEditorMode({
    apiRef,
    formulaBarMode,
    openedExplicitly,
    currentCell,
    setEditMode,
    editMode,
    updateDottedSelectionVisibility,
  });

  const onCodeChange = useCallback(
    (code: string) => {
      if (!gridCallbacksRef.current) return;

      updateCellEditorStyle(code);
      updateEditModeOnCodeChange(code, codeValue.current);
      setSaveOnArrowEnabled(isSaveOnArrowEnabled(code, openedWithNextChar));

      codeValue.current = code;

      if (!shouldSendUpdateEvent(editMode) || !isCellEditorHasFocus()) return;

      gridCallbacksRef.current.onCellEditorUpdateValue?.(
        code,
        false,
        dimFieldName
      );
    },
    [
      dimFieldName,
      editMode,
      gridCallbacksRef,
      updateCellEditorStyle,
      updateEditModeOnCodeChange,
      openedWithNextChar,
    ]
  );

  const openCellEditor = useCallback(
    (col: number, row: number, value: string, initialWidth: number) => {
      if (!apiRef.current) return;

      const api = apiRef.current;
      const x = api.getCellX(col);
      const y = api.getCellY(row);
      const result = getCellEditorStyle(api, x, y, value, zoom, initialWidth);

      if (!result) return;

      const { style, requiresIgnoreScroll } = result;

      if (requiresIgnoreScroll) ignoreScrollEvent.current = true;

      codeValue.current = value;
      setCode.current?.(value);
      setEditorStyle(style);
      setIsOpen(true);
    },
    [apiRef, zoom]
  );

  const showErrorMessage = useCallback(
    (cell?: GridCell): boolean => {
      if (!cell) return false;

      let message = '';

      if (cell?.field?.isKey) {
        message = overrideKeyFieldMessage;
      }

      if (isComplexType(cell?.field)) {
        message = overrideComplexFieldMessage;
      }

      if (editMode !== 'edit_cell_expression' && shouldNotOverrideCell(cell)) {
        message = overrideFilteredOrSortedFieldMessage;
      }

      if (message) {
        gridCallbacksRef?.current?.onMessage?.(message);
      }

      return !!message;
    },
    [editMode, gridCallbacksRef]
  );

  const displayCellEditor = useCallback(
    (col: number, row: number, options: GridCellEditorOpenOptions) => {
      if (!apiRef.current) return;

      const api = apiRef.current;
      const cell = api.getCell(col, row);
      const {
        isEditExpressionShortcut: isEditExpression,
        isRenameShortcut,
        skipFocus,
        onKeyDown,
        explicitOpen,
      } = options;
      const {
        isTableHeader,
        isTableField,
        isTableCell,
        isTotalCell,
        hasOtherCellsInField,
      } = getCellContextParams(api, cell);

      // Check to filter out alt+f2 shortcut for table header
      if (
        isEditExpression &&
        isTableHeader &&
        !isRenameShortcut &&
        !explicitOpen
      )
        return;

      if (isTableHeader && cell?.table) col = cell?.table.startCol;

      const { editMode: nextEditMode, value } = getCellEditorParams(cell, {
        ...options,
        isAlreadyOpened: !!editMode,
        explicitOpen: openedExplicitly || explicitOpen,
        formulaBarMode:
          openedExplicitly || explicitOpen ? formulaBarMode : undefined,
        isOtherCellsInField: hasOtherCellsInField,
      });

      const shouldCheckErrors = !isTableField && !isTotalCell;

      if (shouldCheckErrors) {
        const cancel = showErrorMessage(cell);

        if (cancel) return;
      }

      const shouldTriggerSuggest =
        !explicitOpen && codeEditor && ['=', ':'].includes(value);

      if (shouldTriggerSuggest) {
        setTimeout(
          () => codeEditor.getAction('editor.action.triggerSuggest')?.run(),
          10
        );
      }

      updateDottedSelectionVisibility(col, row, nextEditMode, value);

      if (shouldSendUpdateEvent(nextEditMode) && onKeyDown) {
        gridCallbacksRef?.current?.onCellEditorUpdateValue?.(value, false);
      }

      // Hide value for table cell when editor opened
      if (isTableCell && cell) {
        setEditedCalculatedCellValue(cell.value || '');
        api.setCellValue(col, row, '');
      }

      // TODO: probably we need to get real width of the cell, not a default one, because entire column can be different size
      const gridSizes = api.getGridSizes();
      const { width } = gridSizes.cell;
      const initialWidth = isTableHeader ? 0 : Math.max(0, width);

      // Case when we are writing formula to the right or bottom of vertical or horizontal table
      const contextCell = getCellContext(api.getCell, col, row);

      setCurrentTableName(
        cell?.table?.tableName ?? contextCell?.table?.tableName ?? ''
      );
      setCurrentFieldName(cell?.field?.fieldName || '');
      setCurrentCell({ col, row });
      setEditMode(nextEditMode);

      openCellEditor(col, row, value, initialWidth);
      codeValue.current = value;

      // setTimeout because we need to wait monaco to render
      setTimeout(() => {
        if (!skipFocus) {
          setFocus.current?.();
        }
      }, 0);
    },
    [
      apiRef,
      editMode,
      openedExplicitly,
      formulaBarMode,
      codeEditor,
      updateDottedSelectionVisibility,
      openCellEditor,
      gridCallbacksRef,
      showErrorMessage,
    ]
  );

  // Additional effect to check enable/disable save on arrow
  // onCodeChange() doesn't set correct value on typing first character
  useEffect(() => {
    setSaveOnArrowEnabled(
      isSaveOnArrowEnabled(codeValue.current, openedWithNextChar)
    );
  }, [openedWithNextChar]);

  const value = useMemo(
    () => ({
      codeEditor,
      codeValue,
      currentCell,
      currentFieldName,
      currentTableName,
      dimFieldName,
      displayCellEditor,
      editMode,
      editedCalculatedCellValue,
      editorStyle,
      hide,
      ignoreScrollEvent,
      isDottedSelection,
      isOpen,
      mouseOverSwitcherTooltip,
      onCodeChange,
      openedExplicitly,
      openedWithNextChar,
      restoreCellValue,
      saveOnArrowEnabled,
      setCode,
      setCodeEditor,
      setCurrentCell,
      setCurrentFieldName,
      setCurrentTableName,
      setDimFieldName,
      setEditMode,
      setEditedCalculatedCellValue,
      setEditorStyle,
      setFocus,
      setIsOpen,
      setOpenedExplicitly,
      setOpenedWithNextChar,
    }),
    [
      codeEditor,
      currentCell,
      currentFieldName,
      currentTableName,
      dimFieldName,
      displayCellEditor,
      editMode,
      editedCalculatedCellValue,
      editorStyle,
      hide,
      isOpen,
      onCodeChange,
      openedExplicitly,
      openedWithNextChar,
      restoreCellValue,
      saveOnArrowEnabled,
    ]
  );

  return (
    <CellEditorContext.Provider value={value}>
      {children}
    </CellEditorContext.Provider>
  );
}
