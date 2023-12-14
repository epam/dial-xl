import { useCallback, useContext, useEffect, useRef } from 'react';
import { ReflexContainer, ReflexElement } from 'react-reflex';

import { CodeEditor, SetCodeRefFunction } from '@frontend/code-editor';

import { ProjectContext, SpreadsheetContext } from '../../context';
import useEventBus from '../../hooks/useEventBus';
import { CellEditorUpdateValueMessage, EventBusMessages } from '../../services';
import { FormulaInputTitle } from './FormulaInputTitle';
import { formulaEditorOptions, useFormulaInput } from './utils';

type Props = {
  expanded: boolean;
  fieldName?: string;
  initialValue?: string | null;
  disabled: boolean;
};

export function FormulaInput({
  fieldName,
  expanded,
  initialValue,
  disabled,
}: Props) {
  const eventBus = useEventBus<EventBusMessages>();
  const { selectedCell, functions, parsedSheets } = useContext(ProjectContext);
  const { gridApi } = useContext(SpreadsheetContext);
  const setCode = useRef<SetCodeRefFunction>(null);
  const codeRef = useRef<string | null>(null);
  const skipBlurEffect = useRef(false);

  const { saveFormulaInputValue, getSelectedCellValue } = useFormulaInput();

  const onCodeChange = useCallback(
    (code: string) => {
      codeRef.current = code;

      if (!gridApi) return;

      if (
        !fieldName &&
        initialValue !== code &&
        selectedCell &&
        !gridApi.isCellEditorOpen()
      ) {
        gridApi.showCellEditor(selectedCell.col, selectedCell.row, code);
      }

      if (gridApi.isCellEditorOpen() && !gridApi.isCellEditorFocused()) {
        gridApi.setCellEditorValue(code);
      }
    },
    [gridApi, fieldName, initialValue, selectedCell]
  );

  const closeCellEditor = useCallback(() => {
    if (gridApi?.isCellEditorOpen()) {
      gridApi?.hideCellEditor();
    }
  }, [gridApi]);

  const onSave = useCallback(() => {
    if (codeRef.current === null || gridApi?.isCellEditorFocused()) return;

    skipBlurEffect.current = true;
    saveFormulaInputValue(codeRef.current, selectedCell, fieldName);
    closeCellEditor();
  }, [
    closeCellEditor,
    fieldName,
    gridApi,
    saveFormulaInputValue,
    selectedCell,
  ]);

  const onBlur = useCallback(() => {
    if (skipBlurEffect.current) {
      skipBlurEffect.current = false;

      return;
    }

    // setTimeout because we need to wait for the focus on cell editor
    setTimeout(() => {
      if (gridApi?.isCellEditorFocused()) return;

      saveFormulaInputValue(codeRef.current || '', selectedCell, fieldName);

      const value = getSelectedCellValue(selectedCell, fieldName) || '';
      codeRef.current = value;
      setCode.current?.(value);
      closeCellEditor();
    }, 0);
  }, [
    closeCellEditor,
    fieldName,
    getSelectedCellValue,
    gridApi,
    saveFormulaInputValue,
    selectedCell,
  ]);

  const onEscape = useCallback(() => {
    // skip blur effect because CodeEditor after escape event calls onEscape and then onBlur
    skipBlurEffect.current = true;

    const value = getSelectedCellValue(selectedCell, fieldName) || '';
    codeRef.current = value;
    setCode.current?.(value);

    closeCellEditor();
  }, [closeCellEditor, fieldName, getSelectedCellValue, selectedCell]);

  const handleCellEditorUpdateValue = useCallback(
    (message: CellEditorUpdateValueMessage) => {
      let value = message.value;

      if (message.cancelEdit) {
        value = getSelectedCellValue(selectedCell, fieldName) || '';
      }

      codeRef.current = value;
      setCode.current?.(value);
    },
    [fieldName, getSelectedCellValue, selectedCell]
  );

  const onEditorReady = useCallback(() => {
    if (initialValue === undefined) return;

    codeRef.current = initialValue;
    setCode.current?.(initialValue || '');
  }, [initialValue]);

  useEffect(() => {
    const cellEditorUpdateValueListener = eventBus.subscribe(
      'CellEditorUpdateValue',
      handleCellEditorUpdateValue
    );

    return () => {
      cellEditorUpdateValueListener.unsubscribe();
    };
  }, [eventBus, handleCellEditorUpdateValue]);

  return (
    <ReflexContainer orientation="vertical" windowResizeAware>
      <ReflexElement maxSize={80}>
        <FormulaInputTitle fieldName={fieldName} type={selectedCell?.type} />
      </ReflexElement>
      <ReflexElement>
        <div className="border w-full h-full relative">
          {disabled && (
            <div className="absolute z-10 w-full bg-neutral-100 h-full" />
          )}

          <CodeEditor
            functions={functions}
            isFormulaBar={true}
            language={'formula-bar'}
            options={{
              ...formulaEditorOptions,
              domReadOnly: disabled,
              readOnly: disabled,
            }}
            parsedSheets={parsedSheets}
            setCode={setCode}
            onBlur={onBlur}
            onCodeChange={onCodeChange}
            onEditorReady={onEditorReady}
            onEnter={expanded ? undefined : onSave}
            onEscape={onEscape}
            onSaveButton={onSave}
          />
        </div>
      </ReflexElement>
    </ReflexContainer>
  );
}
