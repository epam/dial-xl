import cx from 'classnames';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Subscription } from 'rxjs';

import {
  CodeEditor,
  editor,
  SetCodeRefFunction,
  SetFocusRefFunction,
} from '@frontend/code-editor';
import {
  GridCell,
  isComplexType,
  isFormulaBarMonacoInputFocused,
  isModalOpen,
  overrideComplexFieldMessage,
  overrideFilteredOrSortedFieldMessage,
  overrideKeyFieldMessage,
  Shortcut,
  shortcutApi,
  shouldNotOverrideCell,
} from '@frontend/common';

import { cellEditorContainerId, cellEditorWrapperId } from '../../constants';
import {
  filterByTypeAndCast,
  getCellContext,
  getMousePosition,
  getPx,
  isCellEditorFocused,
  isClickInsideCanvas,
  showFieldDottedSelection,
} from '../../utils';
import { CellEditorTooltip } from './CellEditorTooltip';
import { baseFontSize, baseLineHeight, cellEditorOptions } from './options';
import {
  CellEditorModes,
  CurrentCell,
  defaultStyle,
  EditorStyle,
  GridCellEditorEventAddOverride,
  GridCellEditorEventAddTotal,
  GridCellEditorEventEdit,
  GridCellEditorEventEditOverride,
  GridCellEditorEventEditTotal,
  GridCellEditorEventFocus,
  GridCellEditorEventHide,
  GridCellEditorEventInsertValue,
  GridCellEditorEventOpenExplicitly,
  GridCellEditorEventRename,
  GridCellEditorEventSetPointClickValue,
  GridCellEditorEventSetValue,
  GridCellEditorEventType,
  GridCellEditorMode,
  GridCellEditorOpenOptions,
  GridCellParams,
  Props,
  SelectionEffectAfterSave,
} from './types';
import {
  canOpenCellEditor,
  cellEditorSaveValue,
  getCellEditorColor,
  getCellEditorParams,
  getCellEditorStyle,
  getCellEditorWidthPx,
  isCellEditorHasFocus,
  isCellEditorValueFormula,
  isOtherCellsInFieldDataHasOverrides,
  shouldDisableHelpers,
  shouldSendUpdateEvent,
  useCellEditorAfterSaveEvents,
} from './utils';

export function CellEditor({
  apiRef,
  app,
  gridCallbacksRef,
  functions,
  parsedSheets,
  theme,
  formulaBarMode,
  isPointClickMode,
  sheetContent,
  zoom = 1,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [openedExplicitly, setOpenedExplicitly] = useState(false);
  const [dimFieldName, setDimFieldName] = useState<string>('');
  const [currentCell, setCurrentCell] = useState<CurrentCell>(null);
  const [editedCalculatedCellValue, setEditedCalculatedCellValue] =
    useState<string>('');
  const [editMode, setEditMode] = useState<GridCellEditorMode>(null);
  const [editorStyle, setEditorStyle] = useState<EditorStyle>(defaultStyle);
  const [openedWithNextChar, setOpenedWithNextChar] = useState<string>('');
  const [currentTableName, setCurrentTableName] = useState<string>('');
  const [currentFieldName, setCurrentFieldName] = useState<string>('');
  const [codeEditor, setCodeEditor] = useState<
    editor.IStandaloneCodeEditor | undefined
  >();
  const codeValue = useRef<string>('');

  const setCode = useRef<SetCodeRefFunction>(null);
  const setFocus = useRef<SetFocusRefFunction>(null);
  const ignoreScrollEvent = useRef<boolean>(false);
  const skipSaveOnBlur = useRef<boolean>(false);
  const viewportNode = useRef<HTMLDivElement>(null);
  const isDottedSelection = useRef<boolean>(false);
  const mouseOverSwitcherTooltip = useRef(false);

  // Point click mode state
  const cursorOffset = useRef<number>(0);
  const lastPointClickValue = useRef<string>('');
  const lastCodeEditorValue = useRef<string>('');

  const { moveSelectionAfterSave } = useCellEditorAfterSaveEvents(apiRef);

  const gridCallbacks = useMemo(() => {
    return gridCallbacksRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridCallbacksRef.current]);

  const disableHelpers = useMemo(() => {
    return shouldDisableHelpers(editMode);
  }, [editMode]);

  const isArrowsCallbacksEnabled = useMemo(
    () =>
      openedWithNextChar && !isCellEditorValueFormula(openedWithNextChar, true),
    [openedWithNextChar]
  );

  const restoreSelection = useCallback(() => {
    if (!apiRef.current || !currentCell) return;

    const { col, row } = currentCell;
    const selection = apiRef.current.getSelection();

    if (
      !selection ||
      (selection && selection.startRow !== row && selection.startCol !== col)
    ) {
      const cell = apiRef.current.getCell(col, row);

      apiRef?.current?.updateSelection({
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: cell ? cell.endCol : col,
      });
    }
  }, [apiRef, currentCell]);

  const restoreCellValue = useCallback(() => {
    if (!apiRef.current) return;

    const cell =
      currentCell && apiRef.current.getCell(currentCell.col, currentCell.row);
    const isTableHeader = !!cell?.isTableHeader;
    const isTableField = cell?.isFieldHeader;
    const isTableCell = !isTableHeader && !isTableField && !!cell?.table;

    // Return back cell value
    if (isTableCell && cell && editedCalculatedCellValue) {
      apiRef.current.setCellValue(
        cell.col,
        cell.row,
        editedCalculatedCellValue
      );
      setEditedCalculatedCellValue('');
    }
  }, [apiRef, currentCell, editedCalculatedCellValue]);

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

    gridCallbacks?.onStopPointClick?.();

    // A way to remove focus from the formula bar, because focusing canvas element is not really working
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    document.activeElement?.blur();
  }, [restoreSelection, restoreCellValue, gridCallbacks, apiRef]);

  const save = useCallback(
    (value: string) => {
      if (!apiRef.current || !gridCallbacks || !currentCell) return;

      skipSaveOnBlur.current = true;
      const { col, row } = currentCell;
      const cell = apiRef.current.getCell(col, row);

      const requiresHide = cellEditorSaveValue({
        editMode,
        currentCell,
        cell,
        value,
        gridCallbacks,
        dimFieldName,
      });

      if (requiresHide) hide();
    },
    [apiRef, currentCell, dimFieldName, editMode, gridCallbacks, hide]
  );

  const onEscape = useCallback(() => {
    skipSaveOnBlur.current = true;

    if (ignoreScrollEvent.current) {
      ignoreScrollEvent.current = false;

      return;
    }

    if (openedExplicitly && !isCellEditorHasFocus()) return;

    gridCallbacks?.onCellEditorUpdateValue?.(codeValue.current, true);

    hide();
  }, [codeValue, gridCallbacks, hide, openedExplicitly]);

  const onBlur = useCallback(() => {
    if (isPointClickMode || mouseOverSwitcherTooltip.current) return;

    if (ignoreScrollEvent.current) {
      ignoreScrollEvent.current = false;

      return;
    }

    const currentCellValue = codeValue.current;

    // setTimeout because we need to wait for the focus on monaco editor
    setTimeout(() => {
      if (openedExplicitly || !document.hasFocus()) {
        return;
      }

      if (!isFormulaBarMonacoInputFocused() && !isModalOpen()) {
        if (!skipSaveOnBlur.current) {
          save(currentCellValue);
          skipSaveOnBlur.current = false;

          return;
        }

        hide();
      }

      skipSaveOnBlur.current = false;
    }, 0);
  }, [hide, isPointClickMode, openedExplicitly, save]);

  const onSave = useCallback(
    (moveSelection: SelectionEffectAfterSave) => {
      save(codeValue.current || '');

      // setTimeout because we need to wait for the cell editor to hide
      // and to have this side effect only in one place
      setTimeout(() => {
        moveSelectionAfterSave(moveSelection);
      }, 0);
    },
    [codeValue, moveSelectionAfterSave, save]
  );

  const onSaveCallback = useCallback(() => {
    onSave('enter');
  }, [onSave]);

  const onTabCallback = useCallback(() => {
    onSave('tab');
  }, [onSave]);

  const onRightArrowCallback = useCallback(() => {
    if (openedWithNextChar) {
      onSave('arrow-right');
    }
  }, [openedWithNextChar, onSave]);

  const onLeftArrowCallback = useCallback(() => {
    if (openedWithNextChar) {
      onSave('arrow-left');
    }
  }, [openedWithNextChar, onSave]);

  const onBottomArrowCallback = useCallback(() => {
    if (openedWithNextChar) {
      onSave('arrow-bottom');
    }
  }, [openedWithNextChar, onSave]);

  const onTopArrowCallback = useCallback(() => {
    if (openedWithNextChar) {
      onSave('arrow-top');
    }
  }, [openedWithNextChar, onSave]);

  const onCtrlEnterCallback = useCallback(() => {
    onSave('ctrl-enter');
  }, [onSave]);

  const updateCellEditorStyle = useCallback(
    (newCode: string) => {
      if (!apiRef.current || !currentCell) return;

      const { col } = currentCell;
      const x = apiRef.current.getCellX(col);
      const currentWidth = parseInt(editorStyle.width);

      const width = getCellEditorWidthPx(
        apiRef.current,
        x,
        newCode,
        zoom,
        false,
        currentWidth
      );

      setEditorStyle((prev) => ({ ...prev, width }));
    },
    [apiRef, currentCell, editorStyle, zoom]
  );

  const updateDottedSelectionVisibility = useCallback(
    (
      col: number | undefined,
      row: number | undefined,
      editMode: GridCellEditorMode,
      codeValue: string
    ) => {
      if (!apiRef.current || !col || !row) return;

      const api = apiRef.current;
      const cell = api.getCell(col, row);

      // Left cell of empty cell
      const leftCell = api.getCell(col - 1, row);
      if (
        !cell?.table &&
        leftCell?.table &&
        !leftCell?.table.isTableHorizontal &&
        isCellEditorValueFormula(codeValue, editMode === 'empty_cell')
      ) {
        showFieldDottedSelection(
          { col, row },
          leftCell.table,
          leftCell.endCol,
          api
        );
        isDottedSelection.current = true;

        return;
      }

      // Left cell of empty cell
      const topCell = api.getCell(col, row - 1);
      if (
        !cell?.table &&
        topCell?.table &&
        topCell?.table.isTableHorizontal &&
        isCellEditorValueFormula(codeValue, editMode === 'empty_cell')
      ) {
        showFieldDottedSelection(
          { col, row },
          topCell.table,
          topCell.endCol,
          api
        );
        isDottedSelection.current = true;

        return;
      }

      if (
        (editMode === 'edit_field_expression' ||
          editMode === 'edit_cell_expression') &&
        cell?.table
      ) {
        showFieldDottedSelection(cell, cell.table, cell.endCol, api);
        isDottedSelection.current = true;

        return;
      }
    },
    [apiRef]
  );

  // Update edit mode and all other things according to new code value
  const updateEditModeIfNeeded = useCallback(
    (newCodeValue: string, oldCodeValue: string) => {
      if (
        !apiRef.current ||
        !currentCell ||
        !editMode ||
        (openedExplicitly && formulaBarMode === 'value')
      )
        return;

      const api = apiRef.current;
      const cell = api.getCell(currentCell.col, currentCell.row);
      const isNewValueFormula = isCellEditorValueFormula(newCodeValue);
      const isOldValueFormula = isCellEditorValueFormula(oldCodeValue);
      const isTypeOfCellValueChanged =
        (isNewValueFormula && !isOldValueFormula) ||
        (!isNewValueFormula && isOldValueFormula);

      const isTableCell = !cell?.isTableHeader && !cell?.isFieldHeader;
      const isOverride = !!cell?.isOverride;
      const otherCellsInFieldHasOverrides = cell
        ? isOtherCellsInFieldDataHasOverrides(cell, api)
        : false;

      // Do not change anything if it's renaming
      if (['rename_table', 'rename_field'].includes(editMode)) {
        if (editMode === 'rename_field' && newCodeValue === '=') {
          setEditMode('edit_field_expression');
          updateDottedSelectionVisibility(
            currentCell?.col,
            currentCell?.row,
            'edit_cell_expression',
            newCodeValue
          );

          return;
        }

        api.hideDottedSelection();

        return;
      }

      if (!isTableCell) {
        return;
      }

      if (['empty_cell'].includes(editMode)) {
        if (isCellEditorValueFormula(newCodeValue, true)) {
          updateDottedSelectionVisibility(
            currentCell?.col,
            currentCell?.row,
            'empty_cell',
            newCodeValue
          );
        }

        return;
      }

      // No other overrides exists
      if (cell && !otherCellsInFieldHasOverrides && isTypeOfCellValueChanged) {
        // Switch from cell value to cell formula value
        if (
          (['edit_override', 'add_override'] as GridCellEditorMode[]).includes(
            editMode
          ) &&
          isNewValueFormula
        ) {
          setEditMode('edit_cell_expression');
          updateDottedSelectionVisibility(
            currentCell?.col,
            currentCell?.row,
            'edit_cell_expression',
            newCodeValue
          );

          return;
        }

        // Switch from cell expression edit to cell value edit
        const sortedOrFiltered = cell.field?.isFiltered || cell.field?.sort;
        if (
          (
            [
              'edit_cell_expression',
              'edit_field_expression',
            ] as GridCellEditorMode[]
          ).includes(editMode) &&
          !isNewValueFormula &&
          !sortedOrFiltered
        ) {
          const newMode = isOverride ? 'edit_override' : 'add_override';
          setEditMode(newMode);
          updateDottedSelectionVisibility(
            currentCell?.col,
            currentCell?.row,
            newMode,
            newCodeValue
          );

          return;
        }
      }
    },
    [
      apiRef,
      currentCell,
      editMode,
      formulaBarMode,
      openedExplicitly,
      updateDottedSelectionVisibility,
    ]
  );

  const onCodeChange = useCallback(
    (code: string) => {
      if (!gridCallbacks) return;

      updateCellEditorStyle(code);
      updateEditModeIfNeeded(code, codeValue.current);

      codeValue.current = code;

      if (!shouldSendUpdateEvent(editMode) || !isCellEditorHasFocus()) return;

      gridCallbacks.onCellEditorUpdateValue?.(code, false, dimFieldName);
    },
    [
      codeValue,
      dimFieldName,
      editMode,
      gridCallbacks,
      updateCellEditorStyle,
      updateEditModeIfNeeded,
    ]
  );

  const getCellParams = useCallback(
    (cell?: GridCell): GridCellParams => {
      const hasOtherOverrides =
        cell && apiRef.current
          ? isOtherCellsInFieldDataHasOverrides(cell, apiRef.current)
          : false;
      const isTableHeader = !!cell?.isTableHeader;
      const isTableField = !!cell?.isFieldHeader;
      const isTableCell = !isTableHeader && !isTableField && !!cell?.table;
      const isTotalCell = !!cell?.totalIndex;
      const isAddTotal = isTableCell && isTotalCell && !cell?.totalType;
      const isEditTotal = isTableCell && isTotalCell && !!cell?.totalType;

      return {
        isTableHeader,
        isTableField,
        isTableCell,
        isTotalCell,
        isAddTotal,
        isEditTotal,
        hasOtherOverrides,
      };
    },
    [apiRef]
  );

  const show = useCallback(
    (col: number, row: number, value: string, initialWidth: number) => {
      if (!apiRef.current) return;

      const x = apiRef.current.getCellX(col);
      const y = apiRef.current.getCellY(row);

      const result = getCellEditorStyle(
        apiRef.current,
        x,
        y,
        value,
        zoom,
        initialWidth
      );

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

  const displayCellEditor = useCallback(
    (col: number, row: number, options: GridCellEditorOpenOptions) => {
      if (!apiRef.current) return;

      const cell = apiRef.current.getCell(col, row);
      const {
        isEditExpressionShortcut: isEditExpression,
        isRenameShortcut,
        skipFocus,
        onKeyDown,
        explicitOpen,
      } = options;
      const { isTableHeader, isTableField, isTableCell, isTotalCell } =
        getCellParams(cell);

      if (isEditExpression && isTableHeader && !isRenameShortcut) return;
      if (isTableHeader && cell?.table) col = cell?.table.startCol;

      const { editMode, value } = getCellEditorParams(cell, {
        ...options,
        explicitOpen: openedExplicitly,
        formulaBarMode: openedExplicitly ? formulaBarMode : undefined,
      });

      if (!isTableField && !isTotalCell) {
        let message = '';

        if (cell?.field?.isKey) {
          message = overrideKeyFieldMessage;
        }

        if (isComplexType(cell?.field)) {
          message = overrideComplexFieldMessage;
        }

        if (
          editMode !== 'edit_cell_expression' &&
          shouldNotOverrideCell(cell)
        ) {
          message = overrideFilteredOrSortedFieldMessage;
        }

        if (message) {
          gridCallbacks?.onCellEditorMessage?.(message);

          return;
        }
      }

      if (!explicitOpen && codeEditor && ['=', ':'].includes(value)) {
        setTimeout(
          () => codeEditor.getAction('editor.action.triggerSuggest')?.run(),
          10
        );
      }

      updateDottedSelectionVisibility(col, row, editMode, value);

      if (shouldSendUpdateEvent(editMode) && onKeyDown) {
        gridCallbacks?.onCellEditorUpdateValue?.(value, false);
      }

      // Hide value for table cell when editor opened
      if (isTableCell && cell) {
        setEditedCalculatedCellValue(cell.value || '');
        apiRef.current.setCellValue(col, row, '');
      }

      // TODO: probably we need to get real width of the cell, not a default one, because entire column can be different size
      const gridSizes = apiRef.current.getGridSizes();
      const { width } = gridSizes.cell;
      const initialWidth = isTableHeader ? 0 : Math.max(0, width);

      // Case when we are writing formula to the right or bottom of vertical or horizontal table
      const contextCell = getCellContext(apiRef.current.getCell, col, row);

      setCurrentTableName(
        cell?.table?.tableName ?? contextCell?.table?.tableName ?? ''
      );
      setCurrentFieldName(cell?.field?.fieldName || '');
      setCurrentCell({ col, row });
      setEditMode(editMode);

      show(col, row, value, initialWidth);
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
      getCellParams,
      openedExplicitly,
      formulaBarMode,
      codeEditor,
      updateDottedSelectionVisibility,
      show,
      gridCallbacks,
    ]
  );

  const onDblClick = useCallback(
    (e: Event) => {
      const mousePosition = getMousePosition(e);
      const gridSizes = apiRef.current?.getGridSizes();

      if (
        !mousePosition ||
        !apiRef.current ||
        !gridSizes ||
        !isClickInsideCanvas(mousePosition.x, mousePosition.y, gridSizes)
      )
        return;

      const { x, y } = mousePosition;
      const { col: targetCol, row } = apiRef.current.getCellFromCoords(x, y);

      const cellData = apiRef.current.getCell(targetCol, row);
      let col = targetCol;

      if (cellData && cellData.startCol !== cellData.endCol) {
        col = cellData.startCol;
      }

      setCurrentCell({ col, row });
      const {
        isTableHeader,
        isTableCell,
        isTableField,
        isAddTotal,
        isEditTotal,
        hasOtherOverrides,
      } = getCellParams(cellData);

      displayCellEditor(col, row, {
        isEditExpressionShortcut: true,
        isRenameShortcut: isTableHeader || isTableField,
        isEditOverride: isTableCell && cellData?.isOverride,
        isAddOverride: isTableCell && !cellData?.isOverride,
        isAddTotal,
        isEditTotal,
        hasOtherOverrides,
        isAlreadyOpened: !!editMode,
      });
    },
    [apiRef, displayCellEditor, editMode, getCellParams]
  );

  const canSwitchEditMode = useCallback(
    (event: KeyboardEvent) => {
      if (!editMode) return !isOpen;

      const isEditShortcut = shortcutApi.is(Shortcut.EditExpression, event);
      const isRenameShortcut = shortcutApi.is(Shortcut.Rename, event, false);

      const canSwitchToEdit =
        isEditShortcut &&
        [
          'rename_field',
          'edit_cell_expression',
          'add_override',
          'edit_override',
        ].includes(editMode);
      const canSwitchToRename =
        isRenameShortcut &&
        [
          'edit_field_expression',
          'edit_cell_expression',
          'add_override',
          'edit_override',
        ].includes(editMode);

      if (canSwitchToEdit || canSwitchToRename) {
        restoreCellValue();

        return true;
      }

      return !isOpen;
    },
    [isOpen, editMode, restoreCellValue]
  );

  const onEditorReady = useCallback(
    (codeEditor: editor.IStandaloneCodeEditor | undefined) => {
      setCodeEditor(codeEditor);
    },
    []
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      const targetElement = event.target as HTMLElement;
      const isCanvasEvent = targetElement.tagName === 'BODY';
      const isCellEditorEvent = isCellEditorFocused();

      if (
        !(isCanvasEvent || isCellEditorEvent) ||
        !canSwitchEditMode(event) ||
        !apiRef.current
      )
        return;

      const selection = apiRef.current.getSelection();

      if (!selection && !currentCell) return;

      const isNoteShortcut = shortcutApi.is(Shortcut.AddNote, event);
      const isSelectRowShortcut = shortcutApi.is(Shortcut.SelectRow, event);
      const isRenameShortcut = shortcutApi.is(Shortcut.Rename, event, false);
      const isEditExpressionShortcut = shortcutApi.is(
        Shortcut.EditExpression,
        event
      );

      if (isNoteShortcut || isSelectRowShortcut) return;
      if (
        !isEditExpressionShortcut &&
        !isRenameShortcut &&
        !canOpenCellEditor(event)
      )
        return;

      const startCol = selection?.startCol ?? currentCell?.col;
      const startRow = selection?.startRow ?? currentCell?.row;

      if (startCol === undefined || startRow === undefined) return;

      const newCurrentCell = apiRef.current.getCell(startCol, startRow);

      const { isTableCell, isAddTotal, isEditTotal, hasOtherOverrides } =
        getCellParams(newCurrentCell);

      let realCodeValue = editMode
        ? codeValue.current
        : codeValue.current || undefined;

      if (
        editMode === 'rename_field' &&
        isEditExpressionShortcut &&
        newCurrentCell
      ) {
        realCodeValue = `=${newCurrentCell.field?.expression || ''}`;
      }

      const initialValue =
        !isEditExpressionShortcut &&
        !isRenameShortcut &&
        canOpenCellEditor(event)
          ? event.key
          : undefined;

      if (initialValue && !openedWithNextChar) {
        setOpenedWithNextChar(event.key);
      }

      displayCellEditor(
        newCurrentCell?.col ?? startCol,
        newCurrentCell?.row ?? startRow,
        {
          isEditExpressionShortcut,
          isRenameShortcut,
          onKeyDown: true,
          isAddOverride: isTableCell,
          isEditOverride: isTableCell && newCurrentCell?.isOverride,
          isAddTotal,
          isEditTotal,
          initialValue: initialValue ?? realCodeValue,
          hasOtherOverrides,
          isAlreadyOpened: !!editMode,
        }
      );
    },
    [
      apiRef,
      canSwitchEditMode,
      currentCell,
      displayCellEditor,
      editMode,
      getCellParams,
      openedWithNextChar,
    ]
  );

  const openExplicitly = useCallback(
    (
      col: number,
      row: number,
      value: string,
      options?: {
        dimFieldName?: string;
        withFocus?: boolean;
      }
    ) => {
      if (!apiRef.current) return;

      const cell = apiRef.current.getCell(col, row);
      const { isTableCell, isAddTotal, isEditTotal, hasOtherOverrides } =
        getCellParams(cell);

      displayCellEditor(col, row, {
        skipFocus: !options?.withFocus,
        explicitOpen: true,
        initialValue: value,
        hasOtherOverrides,
        isAddOverride: isTableCell && !cell?.isOverride,
        isEditOverride: isTableCell && cell?.isOverride,
        isAddTotal,
        isEditTotal,
        isEditExpressionShortcut: formulaBarMode === 'formula',
        isAlreadyOpened: !!editMode,
      });
      setOpenedExplicitly(true);
      setDimFieldName(options?.dimFieldName ?? '');
      setCode.current?.(value);
    },
    [apiRef, displayCellEditor, editMode, formulaBarMode, getCellParams]
  );

  const onStartPointClick = useCallback(
    (offset: number) => {
      cursorOffset.current = offset;
      gridCallbacks?.onStartPointClick?.();
    },
    [gridCallbacks]
  );

  const onStopPointClick = useCallback(
    (offset: number) => {
      if (!apiRef.current) return;

      const isSameValue = codeValue.current === lastCodeEditorValue.current;

      const isOffsetChanged =
        cursorOffset.current + lastPointClickValue.current.length !== offset;

      if (isSameValue && !isOffsetChanged) {
        return;
      }

      lastPointClickValue.current = '';
      lastCodeEditorValue.current = '';
      cursorOffset.current = 0;

      apiRef.current.updateSelection(null, { silent: true });
      gridCallbacks?.onStopPointClick?.();
    },
    [apiRef, gridCallbacks]
  );

  const onPointClick = useCallback(
    (value: string) => {
      const currentValue = codeValue.current || '';
      const offset = cursorOffset.current;
      const updatedOffset = lastPointClickValue.current
        ? offset + lastPointClickValue.current.length
        : offset;
      const updatedValue =
        currentValue.slice(0, offset) +
        value +
        currentValue.slice(updatedOffset);

      lastCodeEditorValue.current = updatedValue;
      lastPointClickValue.current = value;

      setCode.current?.(updatedValue);

      setTimeout(() => {
        setFocus.current?.();
        onCodeChange(updatedValue);
      }, 0);
    },
    [codeValue, onCodeChange]
  );

  const switchToSecondaryEditMode = useCallback(() => {
    if (!apiRef.current || !editMode) return;

    const { subShortcut } = CellEditorModes[editMode];

    if (!subShortcut) return;

    const isEditExpressionShortcut = subShortcut === Shortcut.EditExpression;
    const isRenameShortcut = subShortcut === Shortcut.Rename;

    if (!currentCell) return;

    restoreCellValue();

    const { col, row } = currentCell;

    const cell = apiRef.current.getCell(col, row);
    const { isTableCell, isAddTotal, isEditTotal, hasOtherOverrides } =
      getCellParams(cell);

    displayCellEditor(col, row, {
      isEditExpressionShortcut: !isRenameShortcut && isEditExpressionShortcut,
      isRenameShortcut,
      onKeyDown: true,
      isAddOverride: isTableCell,
      isEditOverride: isTableCell && cell?.isOverride,
      isAddTotal,
      isEditTotal,
      hasOtherOverrides,
      isAlreadyOpened: !!editMode,
    });
  }, [
    apiRef,
    currentCell,
    displayCellEditor,
    editMode,
    getCellParams,
    restoreCellValue,
  ]);

  const onViewportChange = useCallback(() => {
    if (!apiRef.current || !isOpen || !currentCell) return;

    const { col, row } = currentCell;

    const x = apiRef.current.getCellX(col);
    const y = apiRef.current.getCellY(row);

    setEditorStyle((prev) => ({
      ...prev,
      left: getPx(x),
      top: getPx(y),
    }));
  }, [apiRef, currentCell, isOpen]);

  useEffect(() => {
    gridCallbacks?.onCellEditorChangeEditMode?.(editMode);
  }, [editMode, gridCallbacks]);

  useEffect(() => {
    if (!apiRef.current) return;

    const api = apiRef.current;
    const subscriptions: Subscription[] = [];

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventRename>(
            GridCellEditorEventType.Rename
          )
        )
        .subscribe(({ col, row }) => {
          displayCellEditor(col, row, {
            isEditExpressionShortcut: false,
            isRenameShortcut: true,
            isAlreadyOpened: !!editMode,
          });
        })
    );

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventEdit>(
            GridCellEditorEventType.Edit
          )
        )
        .subscribe(({ col, row }) => {
          const cell = api.getCell?.(col, row);
          const { isEditTotal, isAddTotal, hasOtherOverrides, isTableCell } =
            getCellParams(cell);

          displayCellEditor(col, row, {
            isEditExpressionShortcut: true,
            isRenameShortcut: false,
            isAlreadyOpened: !!editMode,
            hasOtherOverrides,
            isAddOverride: isTableCell,
            isEditOverride: isTableCell && cell?.isOverride,
            isAddTotal,
            isEditTotal,
          });
        })
    );

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventAddOverride>(
            GridCellEditorEventType.AddOverride
          )
        )
        .subscribe(({ col, row }) => {
          displayCellEditor(col, row, {
            isAddOverride: true,
            isAlreadyOpened: !!editMode,
          });
        })
    );

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventEditOverride>(
            GridCellEditorEventType.EditOverride
          )
        )
        .subscribe(({ col, row }) => {
          displayCellEditor(col, row, {
            isEditOverride: true,
            isAlreadyOpened: !!editMode,
          });
        })
    );

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventAddTotal>(
            GridCellEditorEventType.AddTotal
          )
        )
        .subscribe(({ col, row }) => {
          displayCellEditor(col, row, {
            isAddTotal: true,
            isAlreadyOpened: !!editMode,
          });
        })
    );

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventEditTotal>(
            GridCellEditorEventType.EditTotal
          )
        )
        .subscribe(({ col, row }) => {
          displayCellEditor(col, row, {
            isEditTotal: true,
            isAlreadyOpened: !!editMode,
          });
        })
    );

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventOpenExplicitly>(
            GridCellEditorEventType.OpenExplicitly
          )
        )
        .subscribe(({ col, row, value, options }) => {
          openExplicitly(col, row, value, options);
        })
    );

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventHide>(
            GridCellEditorEventType.Hide
          )
        )
        .subscribe(() => {
          hide();
        })
    );

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventInsertValue>(
            GridCellEditorEventType.InsertValue
          )
        )
        .subscribe(({ value, options }) => {
          let valueInsertOffset = codeValue.current.length - 1;
          if (cursorOffset.current) {
            valueInsertOffset = cursorOffset.current;
          }

          codeValue.current =
            codeValue.current.substring(0, valueInsertOffset) +
            value +
            codeValue.current.substring(valueInsertOffset);

          setCode.current?.(codeValue.current);

          if (options?.valueCursorOffset) {
            setTimeout(() => {
              const finalValueOffset = options?.valueCursorOffset
                ? options.valueCursorOffset < 0
                  ? value.length + options.valueCursorOffset
                  : options.valueCursorOffset
                : undefined;

              setFocus.current?.({
                cursorOffset: finalValueOffset
                  ? valueInsertOffset + finalValueOffset
                  : undefined,
              });

              codeEditor
                ?.getAction('editor.action.triggerParameterHints')
                ?.run();
            }, 0);
          }
        })
    );

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventSetValue>(
            GridCellEditorEventType.SetValue
          )
        )
        .subscribe(({ value }) => {
          codeValue.current = value;
          setCode.current?.(value);
        })
    );

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventFocus>(
            GridCellEditorEventType.Focus
          )
        )
        .subscribe(() => {
          setFocus.current?.();
        })
    );

    subscriptions.push(
      api.cellEditorEvent$
        .pipe(
          filterByTypeAndCast<GridCellEditorEventSetPointClickValue>(
            GridCellEditorEventType.SetPointClickValue
          )
        )
        .subscribe(({ value }) => {
          onPointClick(value);
        })
    );

    return () => {
      subscriptions.forEach((s) => s.unsubscribe());
    };
  }, [
    apiRef,
    displayCellEditor,
    hide,
    openExplicitly,
    onPointClick,
    editMode,
    getCellParams,
    codeEditor,
  ]);

  useEffect(() => {
    if (!app) return;

    document.addEventListener('keydown', onKeydown as EventListener);
    app.view.addEventListener?.('dblclick', onDblClick as EventListener);

    return () => {
      document.removeEventListener('keydown', onKeydown as EventListener);
      app?.view?.removeEventListener?.('dblclick', onDblClick as EventListener);
    };
  }, [app, onKeydown, onDblClick]);

  useEffect(() => {
    if (!apiRef.current) return;

    const unsubscribe =
      apiRef.current.gridViewportSubscription(onViewportChange);

    return () => {
      unsubscribe();
    };
  }, [apiRef, onViewportChange]);

  return (
    <div
      className="h-full w-full absolute left-0 top-0 pointer-events-none overflow-hidden z-[305]"
      id={cellEditorContainerId}
      ref={viewportNode}
    >
      <div
        className={cx(
          'absolute z-[305] outline outline-[1.5px] pointer-events-auto',
          getCellEditorColor(editMode)
        )}
        data-initial-scroll-left={editorStyle.initialScrollLeft}
        data-initial-scroll-top={editorStyle.initialScrollTop}
        data-left={editorStyle.left}
        data-top={editorStyle.top}
        id={cellEditorWrapperId}
        style={{ display: isOpen ? 'block' : 'none', ...editorStyle }}
      >
        {editMode && (
          <CellEditorTooltip
            bottomOffset={editorStyle.height}
            editMode={editMode}
            mouseOverSwitcherTooltip={mouseOverSwitcherTooltip}
            zoom={zoom}
            onCloseTooltip={() => setFocus.current?.()}
            onSecondaryEditModeSwitch={switchToSecondaryEditMode}
          />
        )}
        <CodeEditor
          codeEditorPlace="cellEditor"
          currentFieldName={currentFieldName}
          currentTableName={currentTableName}
          disableHelpers={disableHelpers}
          functions={functions}
          language="cell-editor"
          options={{
            ...cellEditorOptions,
            fontSize: baseFontSize * zoom,
            lineHeight: baseLineHeight * zoom,
          }}
          parsedSheets={parsedSheets}
          setCode={setCode}
          setFocus={setFocus}
          sheetContent={sheetContent}
          theme={theme}
          onBlur={onBlur}
          onBottomArrow={
            isArrowsCallbacksEnabled ? onBottomArrowCallback : undefined
          }
          onCodeChange={onCodeChange}
          onCtrlEnter={onCtrlEnterCallback}
          onEditorReady={onEditorReady}
          onEnter={onSaveCallback}
          onEscape={onEscape}
          onLeftArrow={
            isArrowsCallbacksEnabled ? onLeftArrowCallback : undefined
          }
          onRightArrow={
            isArrowsCallbacksEnabled ? onRightArrowCallback : undefined
          }
          onSaveButton={onSaveCallback}
          onStartPointClick={onStartPointClick}
          onStopPointClick={onStopPointClick}
          onTab={onTabCallback}
          onTopArrow={isArrowsCallbacksEnabled ? onTopArrowCallback : undefined}
        />
      </div>
    </div>
  );
}
