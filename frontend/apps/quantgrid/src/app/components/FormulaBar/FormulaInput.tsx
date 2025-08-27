import cx from 'classnames';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  GridCellEditorMode,
  isCellEditorOpen,
} from '@frontend/canvas-spreadsheet';
import {
  CodeEditor,
  editor,
  SetCodeRefFunction,
  SetFocusRefFunction,
} from '@frontend/code-editor';
import {
  disabledTooltips,
  isFormulaBarMonacoInputFocused,
} from '@frontend/common';

import { SelectedCellType } from '../../common';
import { AppContext, ChatOverlayContext, ProjectContext } from '../../context';
import { useGridApi } from '../../hooks';
import useEventBus from '../../hooks/useEventBus';
import {
  CellEditorUpdateValueMessage,
  EventBusMessages,
  FormulaBarFormulasMenuItemApplyMessage,
  PointClickSetValue,
} from '../../services';
import {
  FormulaBarModeIndicator,
  FormulaBarTitle,
} from './FormulaBarComponents';
import {
  formulaEditorOptions,
  useFormulaInput,
  useFormulaInputStyles,
} from './utils';

type Props = {
  fieldName?: string;
  inputIndex?: number;
};

export function FormulaInput({ fieldName, inputIndex = 0 }: Props) {
  const eventBus = useEventBus<EventBusMessages>();
  const {
    selectedCell,
    functions,
    parsedSheets,
    sheetContent,
    isProjectEditable,
  } = useContext(ProjectContext);
  const { isAIPendingChanges, isAIEditPendingChanges } =
    useContext(ChatOverlayContext);
  const {
    editMode,
    formulaBarMode,
    formulaBarExpanded,
    theme,
    switchPointClickMode,
    isPointClickMode,
  } = useContext(AppContext);
  const gridApi = useGridApi();

  const [codeEditor, setCodeEditor] = useState<
    editor.IStandaloneCodeEditor | undefined
  >();
  const [isEditingDimField, setIsEditingDimField] = useState(false);

  const setCode = useRef<SetCodeRefFunction>(null);
  const setFocus = useRef<SetFocusRefFunction>(null);
  const codeRef = useRef<string | null>(null);
  const skipBlurEffect = useRef(false);
  const isCurrentPointClickDimField = useRef<boolean>(false);

  // Point click mode state
  const cursorOffset = useRef<number>(0);
  const lastPointClickValue = useRef<string>('');
  const lastCodeEditorValue = useRef<string>('');

  const { saveFormulaInputValue, getSelectedCellValue } = useFormulaInput();
  const { borderColor } = useFormulaInputStyles(fieldName, isEditingDimField);

  const formulaInputEditMode = useMemo((): GridCellEditorMode => {
    if (editMode) return editMode;

    if (fieldName && !editMode) return 'edit_dim_expression';

    return editMode;
  }, [editMode, fieldName]);

  const onCodeChange = useCallback(
    (code: string) => {
      codeRef.current = code;

      if (!gridApi) return;

      const shouldOpenCellEditor =
        selectedCell &&
        isFormulaBarMonacoInputFocused() &&
        !gridApi.isCellEditorOpen();

      if (shouldOpenCellEditor) {
        gridApi.showCellEditor(selectedCell.col, selectedCell.row, code, {
          dimFieldName: fieldName,
        });
        setIsEditingDimField(true);
      }

      if (gridApi.isCellEditorOpen() && !gridApi.isCellEditorFocused()) {
        gridApi.setCellEditorValue(code);
      }
    },
    [gridApi, fieldName, selectedCell]
  );

  const closeCellEditor = useCallback(() => {
    if (gridApi?.isCellEditorOpen()) {
      gridApi?.hideCellEditor();
    }
  }, [gridApi]);

  const onSave = useCallback(() => {
    if (codeRef.current === null || gridApi?.isCellEditorFocused()) return;

    skipBlurEffect.current = true;
    const isCloseCellEditor = saveFormulaInputValue(
      codeRef.current,
      selectedCell,
      formulaInputEditMode,
      fieldName
    );

    if (isCloseCellEditor) {
      setIsEditingDimField(false);
      closeCellEditor();
    }
  }, [
    formulaInputEditMode,
    closeCellEditor,
    fieldName,
    gridApi,
    saveFormulaInputValue,
    selectedCell,
  ]);

  const onBlur = useCallback(() => {
    if (isPointClickMode) return;

    if (skipBlurEffect.current) {
      skipBlurEffect.current = false;

      return;
    }

    // setTimeout because we need to wait for the focus on cell editor
    setTimeout(() => {
      if (gridApi?.isCellEditorFocused()) return;

      const isCloseCellEditor = saveFormulaInputValue(
        codeRef.current || '',
        selectedCell,
        formulaInputEditMode,
        fieldName
      );

      if (isCloseCellEditor) {
        const value = getSelectedCellValue(selectedCell, fieldName) || '';
        codeRef.current = value;
        setCode.current?.(value);

        setIsEditingDimField(false);
        closeCellEditor();

        return;
      }
    }, 0);
  }, [
    isPointClickMode,
    gridApi,
    saveFormulaInputValue,
    selectedCell,
    formulaInputEditMode,
    fieldName,
    getSelectedCellValue,
    closeCellEditor,
  ]);

  const onEscape = useCallback(() => {
    // skip blur effect because CodeEditor after escape event calls onEscape and then onBlur
    skipBlurEffect.current = true;

    const value = getSelectedCellValue(selectedCell, fieldName) || '';
    codeRef.current = value;
    setCode.current?.(value);

    setIsEditingDimField(false);
    closeCellEditor();
  }, [closeCellEditor, fieldName, getSelectedCellValue, selectedCell]);

  const handleCellEditorUpdateValue = useCallback(
    (message: CellEditorUpdateValueMessage) => {
      let value = message.value;
      const { dimFieldName, cancelEdit } = message;

      if (cancelEdit) {
        value = getSelectedCellValue(selectedCell, fieldName) || '';
        setIsEditingDimField(false);
      }

      if (fieldName && dimFieldName !== fieldName && !cancelEdit) return;

      codeRef.current = value;
      setCode.current?.(value);
    },
    [fieldName, getSelectedCellValue, selectedCell]
  );

  const handlePointClickSetValue = useCallback(
    (message: PointClickSetValue) => {
      if (!isPointClickMode || !gridApi) return;

      if (!isCurrentPointClickDimField.current) return;

      const currentValue = codeRef.current || '';
      const offset = cursorOffset.current;
      const updatedOffset = lastPointClickValue.current
        ? offset + lastPointClickValue.current.length
        : offset;
      const updatedValue =
        currentValue.slice(0, offset) +
        message.value +
        currentValue.slice(updatedOffset);

      lastCodeEditorValue.current = updatedValue;
      lastPointClickValue.current = message.value;

      codeRef.current = updatedValue;
      setCode.current?.(updatedValue);

      if (gridApi.isCellEditorOpen() && !gridApi.isCellEditorFocused()) {
        gridApi.setCellEditorValue(updatedValue);
      }

      setFocus.current?.();
    },
    [setFocus, gridApi, isPointClickMode]
  );

  const onEditorReady = useCallback(
    (codeEditor: editor.IStandaloneCodeEditor | undefined) => {
      setCodeEditor(codeEditor);

      const value = getSelectedCellValue(selectedCell, fieldName) || '';

      if (gridApi?.isCellEditorOpen()) return;

      codeRef.current = value;
      setCode.current?.(value);
    },
    [fieldName, getSelectedCellValue, gridApi, selectedCell]
  );

  const onStartPointClick = useCallback(
    (offset: number) => {
      isCurrentPointClickDimField.current = true;
      switchPointClickMode(true, 'formula-bar');
      cursorOffset.current = offset;
    },
    [switchPointClickMode]
  );

  const onStopPointClick = useCallback(
    (offset: number) => {
      const isSameValue = codeRef.current === lastCodeEditorValue.current;
      const isOffsetChanged =
        cursorOffset.current + lastPointClickValue.current.length !== offset;

      if (isSameValue && !isOffsetChanged) {
        return;
      }

      lastPointClickValue.current = '';
      lastCodeEditorValue.current = '';
      cursorOffset.current = 0;
      isCurrentPointClickDimField.current = false;

      switchPointClickMode(false);
      if (gridApi) {
        gridApi.updateSelection(null, { silent: true });
      }
    },
    [gridApi, switchPointClickMode]
  );

  const handleFormulaBarFormulasMenuItemApply = useCallback(
    ({ formulaName }: FormulaBarFormulasMenuItemApplyMessage) => {
      const currentValue = codeRef.current ?? '';
      const currentCursorOffset = currentValue
        ? cursorOffset.current || (currentValue.length ?? 0)
        : 0;
      const addedValue = (currentValue.length ? '' : '=') + formulaName;
      codeRef.current =
        currentValue.slice(0, currentCursorOffset) +
        addedValue +
        currentValue.slice(currentCursorOffset);
      setCode.current?.(codeRef.current);

      if (gridApi?.isCellEditorOpen() && !gridApi?.isCellEditorFocused()) {
        gridApi.setCellEditorValue(codeRef.current);
      } else {
        if (!selectedCell) {
          gridApi?.updateSelection({
            startCol: 1,
            endCol: 1,
            startRow: 1,
            endRow: 1,
          });
        }
        gridApi?.showCellEditor(
          selectedCell?.col ?? 1,
          selectedCell?.row ?? 1,
          codeRef.current
        );
      }

      setFocus.current?.({
        cursorOffset: currentCursorOffset + addedValue.length - 1,
      });
      codeEditor?.getAction('editor.action.triggerParameterHints')?.run();
    },
    [gridApi, codeEditor, selectedCell]
  );

  const isReadOnly = useMemo(() => {
    return (
      (formulaBarMode === 'value' &&
        selectedCell?.type === SelectedCellType.Total) ||
      (isAIPendingChanges && !isAIEditPendingChanges) ||
      !isProjectEditable
    );
  }, [
    formulaBarMode,
    isAIEditPendingChanges,
    isAIPendingChanges,
    isProjectEditable,
    selectedCell?.type,
  ]);

  const readonlyMessage = useMemo(() => {
    if (isAIPendingChanges) {
      return { value: disabledTooltips.pendingAIChanges };
    }

    if (!isProjectEditable) {
      return { value: disabledTooltips.readonlyProject };
    }

    return undefined;
  }, [isAIPendingChanges, isProjectEditable]);

  useEffect(() => {
    const cellEditorUpdateValueListener = eventBus.subscribe(
      'CellEditorUpdateValue',
      handleCellEditorUpdateValue
    );

    const pointClickSetValueListener = eventBus.subscribe(
      'PointClickSetValue',
      handlePointClickSetValue
    );

    const formulaBarFormulasMenuListener = eventBus.subscribe(
      'FormulaBarFormulasMenuItemApply',
      handleFormulaBarFormulasMenuItemApply
    );

    return () => {
      cellEditorUpdateValueListener.unsubscribe();
      pointClickSetValueListener.unsubscribe();
      formulaBarFormulasMenuListener.unsubscribe();
    };
  }, [
    eventBus,
    handleCellEditorUpdateValue,
    handleFormulaBarFormulasMenuItemApply,
    handlePointClickSetValue,
  ]);

  useEffect(() => {
    const value = getSelectedCellValue(selectedCell, fieldName) || '';

    if (codeRef.current === value || isCellEditorOpen()) return;

    codeRef.current = value;
    setCode.current?.(value);
  }, [fieldName, getSelectedCellValue, selectedCell]);

  return (
    <div className="flex h-full w-full items-center">
      {inputIndex === 0 && <FormulaBarModeIndicator />}
      <div className={cx('flex h-full w-full items-center', borderColor)}>
        {fieldName && <FormulaBarTitle text={fieldName} />}
        <div className="w-full h-full relative pt-1">
          <CodeEditor
            codeEditorPlace="formulaBar"
            currentFieldName={selectedCell?.fieldName}
            currentTableName={selectedCell?.tableName}
            functions={functions}
            language="formula-bar"
            options={{
              ...formulaEditorOptions,
              readOnly: isReadOnly,
              readOnlyMessage: readonlyMessage,
              wordWrap: formulaBarExpanded ? 'on' : 'off',
            }}
            parsedSheets={parsedSheets}
            setCode={setCode}
            setFocus={setFocus}
            sheetContent={sheetContent || ''}
            theme={theme}
            onBlur={onBlur}
            onCodeChange={onCodeChange}
            onEditorReady={onEditorReady}
            onEnter={formulaBarExpanded ? undefined : onSave}
            onEscape={onEscape}
            onSaveButton={onSave}
            onStartPointClick={onStartPointClick}
            onStopPointClick={onStopPointClick}
          />
        </div>
      </div>
    </div>
  );
}
