import { Application } from 'pixi.js';
import { useCallback, useContext, useEffect } from 'react';
import { Subscription } from 'rxjs';

import { FormulaBarMode, Shortcut, shortcutApi } from '@frontend/common';

import { GridStateContext, GridViewportContext } from '../../../context';
import {
  filterByTypeAndCast,
  getMousePosition,
  isCanvasEvent,
  isCellEditorFocused,
  isClickInsideCanvas,
} from '../../../utils';
import { CellEditorContext } from '../CellEditorContext';
import {
  CellEditorExplicitOpenOptions,
  GridCellEditorEvent,
  GridCellEditorEventAddTotal,
  GridCellEditorEventEdit,
  GridCellEditorEventEditTotal,
  GridCellEditorEventFocus,
  GridCellEditorEventHide,
  GridCellEditorEventInsertValue,
  GridCellEditorEventOpenExplicitly,
  GridCellEditorEventRename,
  GridCellEditorEventSetValue,
  GridCellEditorEventType,
} from '../types';
import {
  canOpenCellEditor,
  canOpenExplicitlyWithTarget,
  getCellContextParams,
} from '../utils';

type Props = {
  app: Application | null;
  formulaBarMode: FormulaBarMode;
};

export function useCellEditorEvents({ app, formulaBarMode }: Props) {
  const {
    gridSizes,
    isPanModeEnabled,
    getCell,
    selectionEdges,
    cellEditorEvent$,
    canvasId,
    canvasOptions,
  } = useContext(GridStateContext);
  const { getCellFromCoords } = useContext(GridViewportContext);
  const {
    editMode,
    isOpen,
    setCurrentCell,
    currentCell,
    openedWithNextChar,
    setOpenedWithNextChar,
    setFocus,
    setDimFieldName,
    setCode,
    codeValue,
    codeEditor,
    setOpenedExplicitly,
    restoreCellValue,
    displayCellEditor,
    hide,
  } = useContext(CellEditorContext);

  const canSwitchEditMode = useCallback(
    (event: KeyboardEvent) => {
      if (!editMode) return !isOpen;

      const isEditShortcut = shortcutApi.is(Shortcut.EditExpression, event);
      const isRenameShortcut = shortcutApi.is(Shortcut.Rename, event, false);

      const editModes = [
        'rename_field',
        'edit_cell_expression',
        'add_override',
        'edit_override',
      ];
      const canSwitchToEdit = isEditShortcut && editModes.includes(editMode);

      const renameModes = [
        'edit_field_expression',
        'edit_cell_expression',
        'add_override',
        'edit_override',
      ];
      const canSwitchToRename =
        isRenameShortcut && renameModes.includes(editMode);

      if (canSwitchToEdit || canSwitchToRename) {
        restoreCellValue();

        return true;
      }

      return !isOpen;
    },
    [isOpen, editMode, restoreCellValue],
  );

  const onDblClick = useCallback(
    (e: MouseEvent) => {
      const mousePosition = getMousePosition(e, canvasId);
      if (!mousePosition) return;

      if (
        !gridSizes ||
        isPanModeEnabled ||
        !isClickInsideCanvas(
          mousePosition.x,
          mousePosition.y,
          canvasId,
          gridSizes,
        )
      )
        return;

      const { x, y } = mousePosition;
      const { col: targetCol, row } = getCellFromCoords(x, y);
      const cellData = getCell(targetCol, row);
      let col = targetCol;

      if (cellData?.table?.chartType) return;

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
      } = getCellContextParams(cellData);

      displayCellEditor(col, row, {
        isEditExpressionShortcut: true,
        isRenameShortcut: isTableHeader || isTableField,
        isEditOverride: isTableCell && cellData?.isOverride,
        isAddOverride: isTableCell && !cellData?.isOverride,
        isAddTotal,
        isEditTotal,
        hasOtherOverrides,
      });
    },
    [
      canvasId,
      displayCellEditor,
      getCell,
      getCellFromCoords,
      gridSizes,
      isPanModeEnabled,
      setCurrentCell,
    ],
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      const isCellEditorEvent = isCellEditorFocused();
      const isEventRelevant =
        isCanvasEvent(event, canvasOptions) || isCellEditorEvent;

      if (!isEventRelevant || !canSwitchEditMode(event) || isPanModeEnabled) {
        return;
      }

      const isNoteShortcut = shortcutApi.is(Shortcut.AddNote, event);
      const isSelectRowShortcut = shortcutApi.is(Shortcut.SelectRow, event);

      if (isNoteShortcut || isSelectRowShortcut) {
        return;
      }

      const isRenameShortcut = shortcutApi.is(Shortcut.Rename, event, false);
      const isEditExpressionShortcut = shortcutApi.is(
        Shortcut.EditExpression,
        event,
      );
      const canOpenEditor = canOpenCellEditor(event);

      if (!isEditExpressionShortcut && !isRenameShortcut && !canOpenEditor) {
        return;
      }

      const selection = selectionEdges;

      if (!selection && !currentCell) return;

      const startCol = selection?.startCol ?? currentCell?.col;
      const startRow = selection?.startRow ?? currentCell?.row;

      if (startCol === undefined || startRow === undefined) return;

      const newCurrentCell = getCell(startCol, startRow);
      const { isTableCell, isAddTotal, isEditTotal, hasOtherOverrides } =
        getCellContextParams(newCurrentCell);

      let realCodeValue = codeValue.current || undefined;

      if (
        editMode === 'rename_field' &&
        isEditExpressionShortcut &&
        newCurrentCell
      ) {
        realCodeValue = `=${newCurrentCell.field?.expression || ''}`;
      }

      let initialValue: string | undefined;
      if (!isEditExpressionShortcut && !isRenameShortcut) {
        initialValue = event.key;
        if (initialValue && !openedWithNextChar) {
          setOpenedWithNextChar(event.key);
        }
      } else {
        initialValue = realCodeValue;
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
        },
      );
    },
    [
      canvasOptions,
      canSwitchEditMode,
      codeValue,
      currentCell,
      displayCellEditor,
      editMode,
      getCell,
      isPanModeEnabled,
      openedWithNextChar,
      selectionEdges,
      setOpenedWithNextChar,
    ],
  );

  const openExplicitly = useCallback(
    (
      col: number,
      row: number,
      value: string,
      options?: CellEditorExplicitOpenOptions,
    ) => {
      const cell = getCell(col, row);
      const { isTableCell, isAddTotal, isEditTotal, hasOtherOverrides } =
        getCellContextParams(cell);

      if (!canOpenExplicitlyWithTarget(options, cell)) return;

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
      });
      setOpenedExplicitly(true);
      setDimFieldName(options?.dimFieldName ?? '');
      setCode.current?.(value);
    },
    [
      displayCellEditor,
      formulaBarMode,
      getCell,
      setCode,
      setDimFieldName,
      setOpenedExplicitly,
    ],
  );

  const onInsertValue = useCallback(
    (value: string, options?: { valueCursorOffset?: number }) => {
      let valueInsertOffset = codeValue.current.length - 1;
      const cursorPosition = codeEditor?.getPosition();

      if (cursorPosition && options?.valueCursorOffset === -1) {
        valueInsertOffset =
          codeEditor?.getModel()?.getOffsetAt(cursorPosition) ?? 0;
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

          codeEditor?.getAction('editor.action.triggerParameterHints')?.run();
        }, 0);
      }
    },
    [codeEditor, codeValue, setCode, setFocus],
  );

  useEffect(() => {
    const subscriptions: Subscription[] = [];

    const subscribeToCellEditorEvent = <T extends GridCellEditorEvent>(
      eventType: GridCellEditorEventType,
      handler: (event: T) => void,
    ) => {
      return cellEditorEvent$.current
        .pipe(filterByTypeAndCast<T>(eventType))
        .subscribe(handler);
    };

    subscriptions.push(
      subscribeToCellEditorEvent<GridCellEditorEventRename>(
        GridCellEditorEventType.Rename,
        ({ col, row }) => {
          displayCellEditor(col, row, {
            isEditExpressionShortcut: false,
            isRenameShortcut: true,
          });
        },
      ),
    );

    subscriptions.push(
      subscribeToCellEditorEvent<GridCellEditorEventEdit>(
        GridCellEditorEventType.Edit,
        ({ col, row }) => {
          const cell = getCell(col, row);
          const { isEditTotal, isAddTotal, hasOtherOverrides, isTableCell } =
            getCellContextParams(cell);

          displayCellEditor(col, row, {
            isEditExpressionShortcut: true,
            isRenameShortcut: false,
            hasOtherOverrides,
            isAddOverride: isTableCell,
            isEditOverride: isTableCell && cell?.isOverride,
            isAddTotal,
            isEditTotal,
          });
        },
      ),
    );

    subscriptions.push(
      subscribeToCellEditorEvent<GridCellEditorEventAddTotal>(
        GridCellEditorEventType.AddTotal,
        ({ col, row }) => {
          displayCellEditor(col, row, {
            isAddTotal: true,
          });
        },
      ),
    );

    subscriptions.push(
      subscribeToCellEditorEvent<GridCellEditorEventEditTotal>(
        GridCellEditorEventType.EditTotal,
        ({ col, row }) => {
          displayCellEditor(col, row, {
            isEditTotal: true,
          });
        },
      ),
    );

    subscriptions.push(
      subscribeToCellEditorEvent<GridCellEditorEventOpenExplicitly>(
        GridCellEditorEventType.OpenExplicitly,
        ({ col, row, value, options }) => {
          openExplicitly(col, row, value, options);
        },
      ),
    );

    subscriptions.push(
      subscribeToCellEditorEvent<GridCellEditorEventHide>(
        GridCellEditorEventType.Hide,
        () => {
          hide();
        },
      ),
    );

    subscriptions.push(
      subscribeToCellEditorEvent<GridCellEditorEventInsertValue>(
        GridCellEditorEventType.InsertValue,
        ({ value, options }) => {
          onInsertValue(value, options);
        },
      ),
    );

    subscriptions.push(
      subscribeToCellEditorEvent<GridCellEditorEventSetValue>(
        GridCellEditorEventType.SetValue,
        ({ value }) => {
          codeValue.current = value;
          setCode.current?.(value);
        },
      ),
    );

    subscriptions.push(
      subscribeToCellEditorEvent<GridCellEditorEventFocus>(
        GridCellEditorEventType.Focus,
        () => {
          setFocus.current?.();
        },
      ),
    );

    return () => {
      subscriptions.forEach((s) => s.unsubscribe());
    };
  }, [
    cellEditorEvent$,
    codeEditor,
    codeValue,
    displayCellEditor,
    getCell,
    hide,
    onInsertValue,
    openExplicitly,
    setCode,
    setFocus,
  ]);

  useEffect(() => {
    if (!app?.renderer) return;

    document.addEventListener('keydown', onKeydown as EventListener);
    app.canvas.addEventListener?.('dblclick', onDblClick as EventListener);

    return () => {
      if (!app?.renderer) return;

      document.removeEventListener('keydown', onKeydown as EventListener);
      app?.canvas?.removeEventListener?.(
        'dblclick',
        onDblClick as EventListener,
      );
    };
  }, [app, onDblClick, onKeydown]);
}
