import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CodeEditor,
  SetCodeRefFunction,
  SetFocusRefFunction,
} from '@frontend/code-editor';
import {
  overrideKeyFieldMessage,
  Shortcut,
  shortcutApi,
  tableRowOffset,
} from '@frontend/common';

import { cellEditorWrapperId, gridDataContainerClass } from '../../constants';
import {
  filterByTypeAndCast,
  GridCellEditorEventAddOverride,
  GridCellEditorEventEdit,
  GridCellEditorEventEditOverride,
  GridCellEditorEventFocus,
  GridCellEditorEventHide,
  GridCellEditorEventOpenExplicitly,
  GridCellEditorEventRename,
  GridCellEditorEventSetValue,
  GridCellEditorEventType,
} from '../../grid';
import {
  focusSpreadsheet,
  getDataScroller,
  isCellEditorHasFocus,
  isFormulaInputFocused,
  isModalOpen,
} from '../../utils';
import styles from './CellEditor.module.scss';
import { baseFontSize, baseLineHeight, cellEditorOptions } from './options';
import {
  CurrentCell,
  defaultStyle,
  EditorStyle,
  GridCellEditorMode,
  GridCellEditorOpenOptions,
  Props,
} from './types';
import {
  canOpenCellEditor,
  cellEditorSaveValue,
  getCellEditorParams,
  getCellEditorStyle,
  getCellEditorWidthPx,
  shouldDisableHelpers,
  shouldSendUpdateEvent,
} from './utils';

export function CellEditor({
  gridCallbacksRef,
  api,
  functions,
  parsedSheets,
  zoom = 1,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [openedExplicitly, setOpenedExplicitly] = useState(false);
  const [currentCell, setCurrentCell] = useState<CurrentCell>(null);
  const [editMode, setEditMode] = useState<GridCellEditorMode>(null);
  const [editorStyle, setEditorStyle] = useState<EditorStyle>(defaultStyle);
  const [rowNumberWidth, setRowNumberWidth] = useState<number>(0);

  const setCode = useRef<SetCodeRefFunction>(null);
  const setFocus = useRef<SetFocusRefFunction>(null);
  const codeRef = useRef<string>('');
  const ignoreScrollEvent = useRef<boolean>(false);
  const skipSaveOnBlur = useRef<boolean>(false);

  const disableHelpers = useMemo(() => {
    return shouldDisableHelpers(editMode);
  }, [editMode]);

  const hide = useCallback(() => {
    setIsOpen(false);
    setCurrentCell(null);
    setEditMode(null);
    setOpenedExplicitly(false);

    // Fixing issue when hide cell editor - arrow buttons begin to affect scrolling
    focusSpreadsheet();
  }, []);

  const save = useCallback(
    (value: string) => {
      if (!api || !currentCell) return;

      skipSaveOnBlur.current = true;
      const { col, row } = currentCell;
      const cell = api.getCell(col, row);

      const requiresHide = cellEditorSaveValue(
        currentCell,
        editMode,
        cell,
        value,
        gridCallbacksRef.current
      );

      if (requiresHide) hide();
    },
    [api, currentCell, editMode, gridCallbacksRef, hide]
  );

  const onEscape = useCallback(() => {
    skipSaveOnBlur.current = true;

    if (ignoreScrollEvent.current) {
      ignoreScrollEvent.current = false;

      return;
    }

    if (openedExplicitly && !isCellEditorHasFocus()) return;

    gridCallbacksRef.current.onCellEditorUpdateValue?.(codeRef.current, true);

    hide();
  }, [gridCallbacksRef, hide, openedExplicitly]);

  const onBlur = useCallback(() => {
    if (ignoreScrollEvent.current) {
      ignoreScrollEvent.current = false;

      return;
    }

    const currentCellValue = codeRef.current;

    // setTimeout because we need to wait for the focus on monaco editor
    setTimeout(() => {
      if (openedExplicitly || !document.hasFocus()) {
        return;
      }

      if (!isFormulaInputFocused() && !isModalOpen()) {
        if (!skipSaveOnBlur.current) {
          save(currentCellValue);
          skipSaveOnBlur.current = false;

          return;
        }

        hide();
      }

      skipSaveOnBlur.current = false;
    }, 0);
  }, [hide, openedExplicitly, save]);

  const onSave = useCallback(() => {
    save(codeRef.current || '');
  }, [save]);

  const updateCellEditorStyle = useCallback(() => {
    if (currentCell && api) {
      const { col, row } = currentCell;
      const { x } = api.getCellPosition(col, row);
      const currentWidth = parseInt(editorStyle.width);

      const width = getCellEditorWidthPx(
        x,
        codeRef.current,
        zoom,
        false,
        currentWidth
      );

      setEditorStyle((prev) => ({ ...prev, width }));
    }
  }, [api, currentCell, editorStyle, zoom]);

  const onCodeChange = useCallback(
    (code: string) => {
      codeRef.current = code;

      updateCellEditorStyle();

      if (!shouldSendUpdateEvent(editMode) || !isCellEditorHasFocus()) return;

      gridCallbacksRef.current.onCellEditorUpdateValue?.(code, false);
    },
    [editMode, gridCallbacksRef, updateCellEditorStyle]
  );

  const show = useCallback(
    (col: number, row: number, value: string) => {
      if (!api) return;

      const { x, y } = api.getCellPosition(col, row);
      const result = getCellEditorStyle(x, y, value, rowNumberWidth, zoom);

      if (!result) return;

      const { style, requiresIgnoreScroll } = result;

      if (requiresIgnoreScroll) ignoreScrollEvent.current = true;

      codeRef.current = value;
      setCode.current?.(value);
      setEditorStyle(style);
      setIsOpen(true);
    },
    [api, rowNumberWidth, zoom]
  );

  const displayCellEditor = useCallback(
    (col: number, row: number, options: GridCellEditorOpenOptions) => {
      if (openedExplicitly || !api) return;

      const cell = api.getCell(col, row);
      const { isEditExpression, isRenameShortcut, skipFocus, onKeyDown } =
        options;
      const isTableHeader = api.isTableHeader(col, row);
      const isTableField = api.isTableField(col, row);
      const isTableCell = cell?.table
        ? row >= cell?.table.startRow + tableRowOffset
        : false;

      if (!isTableField && cell?.field?.isKey) {
        gridCallbacksRef.current.onCellEditorMessage?.(overrideKeyFieldMessage);

        return;
      }

      if (isEditExpression && isTableHeader && !isRenameShortcut) return;
      if (isTableHeader && cell?.table) col = cell?.table.startCol;

      const { editMode, value } = getCellEditorParams(
        cell,
        options,
        isTableHeader,
        isTableField,
        isTableCell
      );

      if (shouldSendUpdateEvent(editMode) && onKeyDown) {
        gridCallbacksRef.current.onCellEditorUpdateValue?.(value, false);
      }

      setCurrentCell({ col, row });
      setEditMode(editMode);
      show(col, row, value);
      codeRef.current = value;

      // setTimeout because we need to wait monaco to render
      setTimeout(() => {
        if (!skipFocus) {
          setFocus.current?.(true);
        }
      }, 0);
    },
    [api, gridCallbacksRef, openedExplicitly, show]
  );

  const onDblClick = useCallback(
    (event: Event) => {
      if (!api) return;

      const element = event.target as HTMLElement;

      let currentCell: CurrentCell = null;

      if (element.dataset.row && element.dataset.col) {
        currentCell = {
          col: +element.dataset.col,
          row: +element.dataset.row,
        };
      }

      if (!currentCell) return;

      setCurrentCell(currentCell);

      const { col, row } = currentCell;
      const cell = api.getCell(col, row);
      const isTableHeader = cell?.table?.startRow === row;
      const isTableField = api.isTableField(col, row);
      const isTableCell = cell?.table
        ? row >= cell?.table.startRow + tableRowOffset
        : false;

      displayCellEditor(col, row, {
        isEditExpression: isTableField,
        isRenameShortcut: isTableHeader,
        isEditOverride: isTableCell && cell?.isOverride,
        isAddOverride: isTableCell && !cell?.isOverride,
      });
    },
    [api, displayCellEditor]
  );

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (isOpen || !api) return;

      const isRenameShortcut = shortcutApi.is(Shortcut.Rename, event);
      const isEditExpression = event.key === 'F2';

      if (!(isEditExpression || isRenameShortcut || canOpenCellEditor(event)))
        return;

      const selection = api.selection$.getValue();

      if (!selection) return;

      const { startCol, startRow, endCol, endRow } = selection;

      if (
        !(startCol === endCol && startRow === endRow) &&
        !api.isTableHeaderSelected()
      )
        return;

      const currentCell = api.getCell(startCol, startRow);

      const isTableCell = currentCell?.table
        ? startRow >= currentCell.table.startRow + 2
        : false;

      const initialValue =
        !isEditExpression && !isRenameShortcut ? event.key : '';

      displayCellEditor(startCol, startRow, {
        isEditExpression,
        isRenameShortcut,
        onKeyDown: true,
        isAddOverride: isTableCell,
        initialValue,
      });
    },
    [api, displayCellEditor, isOpen]
  );

  const openExplicitly = useCallback(
    (col: number, row: number, value: string) => {
      displayCellEditor(col, row, { skipFocus: true, explicitOpen: true });
      setOpenedExplicitly(true);
      codeRef.current = value;
      setCode.current?.(value);
    },
    [displayCellEditor]
  );

  useEffect(() => {
    if (!api) return;

    const cellEditorRenameSubscription = api.cellEditorEvent$
      .pipe(
        filterByTypeAndCast<GridCellEditorEventRename>(
          GridCellEditorEventType.Rename
        )
      )
      .subscribe(({ col, row }) => {
        displayCellEditor(col, row, {
          isEditExpression: false,
          isRenameShortcut: true,
        });
      });

    const cellEditorEditSubscription = api.cellEditorEvent$
      .pipe(
        filterByTypeAndCast<GridCellEditorEventEdit>(
          GridCellEditorEventType.Edit
        )
      )
      .subscribe(({ col, row }) => {
        displayCellEditor(col, row, {
          isEditExpression: true,
          isRenameShortcut: false,
        });
      });

    const cellEditorAddOverrideSubscription = api.cellEditorEvent$
      .pipe(
        filterByTypeAndCast<GridCellEditorEventAddOverride>(
          GridCellEditorEventType.AddOverride
        )
      )
      .subscribe(({ col, row }) => {
        displayCellEditor(col, row, { isAddOverride: true });
      });

    const cellEditorEditOverrideSubscription = api.cellEditorEvent$
      .pipe(
        filterByTypeAndCast<GridCellEditorEventEditOverride>(
          GridCellEditorEventType.EditOverride
        )
      )
      .subscribe(({ col, row }) => {
        displayCellEditor(col, row, { isEditOverride: true });
      });

    const cellEditorOpenSubscription = api.cellEditorEvent$
      .pipe(
        filterByTypeAndCast<GridCellEditorEventOpenExplicitly>(
          GridCellEditorEventType.OpenExplicitly
        )
      )
      .subscribe(({ col, row, value }) => {
        openExplicitly(col, row, value);
      });

    const cellEditorHideSubscription = api.cellEditorEvent$
      .pipe(
        filterByTypeAndCast<GridCellEditorEventHide>(
          GridCellEditorEventType.Hide
        )
      )
      .subscribe(() => {
        hide();
      });

    const cellEditorSetValueSubscription = api.cellEditorEvent$
      .pipe(
        filterByTypeAndCast<GridCellEditorEventSetValue>(
          GridCellEditorEventType.SetValue
        )
      )
      .subscribe(({ value }) => {
        codeRef.current = value;
        setCode.current?.(value);
      });

    const cellEditorFocusSubscription = api.cellEditorEvent$
      .pipe(
        filterByTypeAndCast<GridCellEditorEventFocus>(
          GridCellEditorEventType.Focus
        )
      )
      .subscribe(() => {
        setFocus.current?.(true);
      });

    const rowNumberResizeSubscription = api.rowNumberResize$.subscribe(
      ({ width }) => {
        setRowNumberWidth(width);
      }
    );

    return () => {
      [
        cellEditorRenameSubscription,
        cellEditorEditSubscription,
        cellEditorAddOverrideSubscription,
        cellEditorEditOverrideSubscription,
        cellEditorOpenSubscription,
        cellEditorHideSubscription,
        cellEditorSetValueSubscription,
        rowNumberResizeSubscription,
        cellEditorFocusSubscription,
      ].forEach((s) => s.unsubscribe());
    };
  }, [api, displayCellEditor, hide, openExplicitly]);

  useEffect(() => {
    const dataContainer = document.querySelector(`.${gridDataContainerClass}`);
    dataContainer?.addEventListener('dblclick', onDblClick);

    const gridDataScroller = getDataScroller();
    gridDataScroller?.addEventListener('scroll', onEscape);

    document.addEventListener('keydown', onKeydown);

    return () => {
      dataContainer?.removeEventListener('dblclick', onDblClick);
      gridDataScroller?.removeEventListener('scroll', onEscape);
      document.removeEventListener('keydown', onKeydown);
    };
  }, [onDblClick, onEscape, onKeydown]);

  return (
    <div className={styles.cellEditorContainer}>
      <div
        className={styles.cellEditorWrapper}
        id={cellEditorWrapperId}
        style={{ display: isOpen ? 'block' : 'none', ...editorStyle }}
      >
        <CodeEditor
          disableHelpers={disableHelpers}
          functions={functions}
          isFormulaBar={true}
          language={'cell-editor'}
          options={{
            ...cellEditorOptions,
            fontSize: baseFontSize * zoom,
            lineHeight: baseLineHeight * zoom,
          }}
          parsedSheets={parsedSheets}
          setCode={setCode}
          setFocus={setFocus}
          onBlur={onBlur}
          onCodeChange={onCodeChange}
          onEnter={onSave}
          onEscape={onEscape}
          onSaveButton={onSave}
        />
      </div>
    </div>
  );
}
