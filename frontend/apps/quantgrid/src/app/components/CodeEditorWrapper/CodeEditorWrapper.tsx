import { useCallback, useContext, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

import { CodeEditor, SetCodeRefFunction } from '@frontend/code-editor';
import { CodeEditorContext } from '@frontend/common';

import {
  AppContext,
  AppSpreadsheetInteractionContext,
  ProjectContext,
  UndoRedoContext,
} from '../../context';
import { useDSLErrors, useGridApi } from '../../hooks';
import {
  autoFixSheetTableOrFieldName,
  autoFunctionsToUppercase,
  autoRenameFields,
  autoRenameTables,
  autoTablePlacement,
  getDSLChangeText,
} from '../../services';

export function CodeEditorWrapper() {
  const codeRef = useRef('');
  const setCode = useRef<SetCodeRefFunction>(null);

  const {
    functions,
    parsedSheets,
    projectName,
    projectSheets,
    sheetName,
    sheetContent,
    manuallyUpdateSheetContent,
    projectVersion,
  } = useContext(ProjectContext);
  const { openTable, openField } = useContext(AppSpreadsheetInteractionContext);
  const gridApi = useGridApi();
  const { updateHasUnsavedChanges, hasUnsavedChanges, unsavedChangesVersion } =
    useContext(CodeEditorContext);
  const { append, undo, redo } = useContext(UndoRedoContext);
  const { theme } = useContext(AppContext);
  const { errors } = useDSLErrors();

  useEffect(() => {
    if (!projectName && !sheetName) {
      setCode.current?.('');
    }
  }, [projectName, sheetName]);

  useEffect(() => {
    if (sheetName && !hasUnsavedChanges) {
      setCode.current?.(sheetContent || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetContent]);

  const updateCodeStatus = useCallback(
    (currentCode: string, sheetContent = '') => {
      if (!projectVersion) return;

      const isCodeChanged =
        currentCode.replaceAll('\r', '') !== sheetContent?.replaceAll('\r', '');

      updateHasUnsavedChanges(isCodeChanged, projectVersion);
    },
    [projectVersion, updateHasUnsavedChanges]
  );

  const onEditorReady = useCallback(() => {
    if (!hasUnsavedChanges) {
      codeRef.current = sheetContent || '';
      setCode.current?.(codeRef.current);
      updateCodeStatus(codeRef.current, codeRef.current);
    }
  }, [hasUnsavedChanges, sheetContent, updateCodeStatus]);

  const onCodeChange = useCallback(
    (code: string) => {
      codeRef.current = code;
      updateCodeStatus(codeRef.current, sheetContent ?? undefined);
    },
    [sheetContent, updateCodeStatus]
  );

  const onSave = useCallback(() => {
    if (
      projectName &&
      sheetName &&
      projectSheets &&
      codeRef.current !== sheetContent
    ) {
      if (unsavedChangesVersion !== projectVersion) {
        toast.error(
          'Cannot save project, due to project version on the server changed during your edit.'
        );

        return;
      }

      let updatedSheetContent = autoRenameTables(
        codeRef.current,
        sheetName,
        projectSheets
      );
      updatedSheetContent = autoRenameFields(updatedSheetContent);
      updatedSheetContent = autoTablePlacement(updatedSheetContent);
      updatedSheetContent = autoFunctionsToUppercase(
        updatedSheetContent,
        functions
      );
      updatedSheetContent = autoFixSheetTableOrFieldName(
        updatedSheetContent,
        parsedSheets
      );

      codeRef.current = updatedSheetContent;
      setCode.current?.(updatedSheetContent);
      updateCodeStatus(codeRef.current, codeRef.current);

      manuallyUpdateSheetContent(sheetName, updatedSheetContent);

      gridApi?.clearSelection();

      const dslChangeText = getDSLChangeText(
        sheetContent || '',
        updatedSheetContent
      );

      append(dslChangeText, updatedSheetContent);
    }
  }, [
    projectName,
    sheetName,
    projectSheets,
    sheetContent,
    gridApi,
    unsavedChangesVersion,
    projectVersion,
    functions,
    parsedSheets,
    updateCodeStatus,
    manuallyUpdateSheetContent,
    append,
  ]);

  const onUndo = useCallback(() => {
    onSave();
    undo();
  }, [onSave, undo]);

  const onGoToTable = useCallback(
    (tableName: string) => {
      if (!sheetName) return;

      openTable(sheetName, tableName);
    },
    [openTable, sheetName]
  );

  const onGoToField = useCallback(
    (tableName: string, fieldName: string) => {
      if (!sheetName) return;

      openField(sheetName, tableName, fieldName);
    },
    [openField, sheetName]
  );

  return (
    <div className="h-[calc(100%-20px)] w-full pt-5 bg-bgLayer3">
      <CodeEditor
        codeEditorPlace="codeEditor"
        errors={errors}
        functions={functions}
        language="code-editor"
        parsedSheets={parsedSheets}
        setCode={setCode}
        sheetContent={sheetContent || ''}
        theme={theme}
        onBlur={onSave}
        onCodeChange={onCodeChange}
        onEditorReady={onEditorReady}
        onGoToField={onGoToField}
        onGoToTable={onGoToTable}
        onRedo={redo}
        onSaveButton={onSave}
        onUndo={onUndo}
      />
    </div>
  );
}
