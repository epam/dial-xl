import {
  JSX,
  PropsWithChildren,
  useCallback,
  useContext,
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
  isCodeEditorMonacoInputFocused,
  overrideFilteredOrSortedFieldMessage,
  overrideKeyFieldMessage,
} from '@frontend/common';

import { GridStateContext, GridViewportContext } from '../../../context';
import { GridCell } from '../../../types';
import {
  getCellContext,
  getPx,
  GridEventBus,
  shouldNotOverrideCell,
} from '../../../utils';
import {
  useCellEditorDottedSelection,
  useCellEditorMode,
  useCellEditorRestore,
  useCellEditorStyle,
} from '../hooks';
import {
  CurrentCell,
  defaultStyle,
  EditorStyle,
  GridCellEditorMode,
  GridCellEditorOpenOptions,
} from '../types';
import {
  getCellContextParams,
  getCellEditorHeight,
  getCellEditorMaxWidth,
  getCellEditorParams,
  getCellEditorStyle,
  getCellEditorSymbolsRequiredWidth,
  isCellEditorHasFocus,
  isSaveOnArrowEnabled,
  shouldSendUpdateEvent,
} from '../utils';
import { CellEditorContext } from './CellEditorContext';

type CellEditorContextProps = {
  eventBus: GridEventBus;
  formulaBarMode: FormulaBarMode;
  isReadOnly: boolean;
};

export function CellEditorContextProvider({
  children,
  eventBus,
  formulaBarMode,
  isReadOnly,
}: PropsWithChildren<CellEditorContextProps>): JSX.Element {
  const {
    hideDottedSelection,
    gridSizes,
    getCell,
    setCellValue,
    zoom,
    columnSizes,
    canvasId,
  } = useContext(GridStateContext);
  const { getCellX, getCellY, moveViewport } = useContext(GridViewportContext);
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
    currentCell,
    editedCalculatedCellValue,
    setEditedCalculatedCellValue,
  });
  const { updateCellEditorStyle } = useCellEditorStyle({
    currentCell,
    editorStyle,
    setEditorStyle,
    zoom,
    columnSizes,
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
      hideDottedSelection();
      isDottedSelection.current = false;
    }

    eventBus.emit({
      type: 'selection/point-click-stopped',
    });

    // A way to remove focus from the formula bar, because focusing canvas element is not really working
    if (!isCodeEditorMonacoInputFocused()) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      document.activeElement?.blur();
    }
  }, [restoreCellValue, restoreSelection, eventBus, hideDottedSelection]);

  const { updateDottedSelectionVisibility } = useCellEditorDottedSelection({
    isDottedSelection,
  });

  const { updateEditModeOnCodeChange } = useCellEditorMode({
    formulaBarMode,
    openedExplicitly,
    currentCell,
    setEditMode,
    editMode,
    updateDottedSelectionVisibility,
  });

  const onCodeChange = useCallback(
    (code: string) => {
      updateCellEditorStyle(code);
      updateEditModeOnCodeChange(code, codeValue.current);
      setSaveOnArrowEnabled(isSaveOnArrowEnabled(code, openedWithNextChar));

      codeValue.current = code;

      if (!shouldSendUpdateEvent(editMode) || !isCellEditorHasFocus()) return;

      eventBus.emit({
        type: 'editor/value-updated',
        payload: {
          value: code,
          cancelEdit: false,
          dimFieldName,
        },
      });
    },
    [
      dimFieldName,
      editMode,
      eventBus,
      updateCellEditorStyle,
      updateEditModeOnCodeChange,
      openedWithNextChar,
    ],
  );

  const onContentHeightChange = useCallback(
    (contentHeight: number) => {
      if (!currentCell) return;

      const code = codeValue.current;
      const isMultiline = code.includes('\n');

      const y = getCellY(currentCell.row);
      const x = getCellX(currentCell.col);

      setEditorStyle((prev) => {
        const requiredSingleLineWidth = getCellEditorSymbolsRequiredWidth({
          value: code,
          zoom,
        });
        const maxWidth = getCellEditorMaxWidth({
          canvasId,
          gridSizes,
          x,
        });
        const isWidthEnough = maxWidth >= requiredSingleLineWidth;

        const shouldApplyHeight = isMultiline || !isWidthEnough;
        if (!shouldApplyHeight) {
          return prev;
        }

        return {
          ...prev,
          height: getPx(
            getCellEditorHeight({
              canvasId,
              gridSizes,
              y,
              contentHeight,
            }),
          ),
        };
      });
    },
    [canvasId, currentCell, getCellX, getCellY, gridSizes, zoom],
  );

  const openCellEditor = useCallback(
    (col: number, row: number, value: string, initialWidth: number) => {
      const x = getCellX(col);
      const y = getCellY(row);
      const result = getCellEditorStyle({
        canvasId,
        gridSizes,
        x,
        y,
        value,
        valueColumn: col,
        valueRow: row,
        columnSizes,
        zoom,
        cellWidth: initialWidth,
        moveViewport,
      });

      if (!result) return;

      const { style, requiresIgnoreScroll } = result;

      if (requiresIgnoreScroll) ignoreScrollEvent.current = true;

      codeValue.current = value;
      setCode.current?.(value);
      setEditorStyle(style);
      setIsOpen(true);
    },
    [canvasId, columnSizes, getCellX, getCellY, gridSizes, moveViewport, zoom],
  );

  const showErrorMessage = useCallback(
    (cell?: GridCell): boolean => {
      if (!cell) return false;

      let message = '';

      if (cell?.field?.isKey) {
        message = overrideKeyFieldMessage;
      }

      if (editMode !== 'edit_cell_expression' && shouldNotOverrideCell(cell)) {
        message = overrideFilteredOrSortedFieldMessage;
      }

      if (message) {
        eventBus.emit({
          type: 'system/message',
          payload: message,
        });
      }

      return !!message;
    },
    [editMode, eventBus],
  );

  const displayCellEditor = useCallback(
    (col: number, row: number, options: GridCellEditorOpenOptions) => {
      if (isReadOnly) return;

      const cell = getCell(col, row);
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
      } = getCellContextParams(cell);

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
          10,
        );
      }

      updateDottedSelectionVisibility(col, row, nextEditMode, value);

      if (shouldSendUpdateEvent(nextEditMode) && onKeyDown) {
        eventBus.emit({
          type: 'editor/value-updated',
          payload: {
            value,
            cancelEdit: false,
          },
        });
      }

      // Hide value for table cell when editor opened
      if (isTableCell && cell) {
        setEditedCalculatedCellValue(cell.value || '');
        setCellValue(col, row, '');
      }

      // TODO: probably we need to get real width of the cell, not a default one, because entire column can be different size
      const { width } = gridSizes.cell;
      const initialWidth = isTableHeader ? 0 : Math.max(0, width);

      // Case when we are writing formula to the right or bottom of a vertical or horizontal table
      const contextCell = getCellContext(getCell, col, row);

      setCurrentTableName(
        cell?.table?.tableName ?? contextCell?.table?.tableName ?? '',
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
      isReadOnly,
      getCell,
      editMode,
      openedExplicitly,
      formulaBarMode,
      codeEditor,
      updateDottedSelectionVisibility,
      gridSizes.cell,
      openCellEditor,
      showErrorMessage,
      eventBus,
      setCellValue,
    ],
  );

  // Additional effect to check enable/disable save on arrow
  // onCodeChange() doesn't set correct value on typing first character
  useEffect(() => {
    setSaveOnArrowEnabled(
      isSaveOnArrowEnabled(codeValue.current, openedWithNextChar),
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
      onContentHeightChange,
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
      onContentHeightChange,
      openedExplicitly,
      openedWithNextChar,
      restoreCellValue,
      saveOnArrowEnabled,
    ],
  );

  return (
    <CellEditorContext.Provider value={value}>
      {children}
    </CellEditorContext.Provider>
  );
}
