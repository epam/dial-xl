import { useCallback, useContext, useEffect, useRef } from 'react';

import { CodeEditor, SetCodeRefFunction } from '@frontend/code-editor';
import {
  CodeEditorContext,
  codeEditorId,
  disabledTooltips,
  isCodeEditorMonacoInputFocused,
} from '@frontend/common';
import { newLine } from '@frontend/parser';

import { PanelName } from '../../common';
import {
  AppContext,
  AppSpreadsheetInteractionContext,
  ChatOverlayContext,
  LayoutContext,
  ProjectContext,
  UndoRedoContext,
  ViewportContext,
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
import { stripNewLinesAtEnd } from '../../utils';

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
    initConflictResolving,
    isProjectChangedOnServerByUser: isProjectChangedByUser,
    isProjectEditable,
  } = useContext(ProjectContext);
  const { viewGridData } = useContext(ViewportContext);
  const { isAIPendingChanges, isAIEditPendingChanges } =
    useContext(ChatOverlayContext);
  const { openTable, openField } = useContext(AppSpreadsheetInteractionContext);
  const gridApi = useGridApi();
  const { showHasUnsavedChanges } = useContext(CodeEditorContext);
  const { appendTo } = useContext(UndoRedoContext);
  const { theme } = useContext(AppContext);
  const { expandedPanelSide, toggleExpandPanel } = useContext(LayoutContext);
  const { errors } = useDSLErrors();

  const hasUnsavedChangesRef = useRef<boolean | null>(null);
  const unsavedChangesVersionRef = useRef<string | null>(null);
  const currentSheetName = useRef<string | null>(null);

  // We need use same '\r\n' newlines for conditions checks
  const getNormalizedValue = (value: string) =>
    value
      .replaceAll('\r\n', '\0')
      .replaceAll('\n', '\0')
      .replaceAll('\0', '\r\n');

  useEffect(() => {
    if (!projectName && !sheetName) {
      setCode.current?.('');
    }
  }, [projectName, sheetName]);

  useEffect(() => {
    if (sheetName && !hasUnsavedChangesRef.current) {
      const isAnotherSheet = currentSheetName.current !== sheetName;
      setCode.current?.(sheetContent || '', !isAnotherSheet);
    }
    currentSheetName.current = sheetName;
  }, [sheetContent, sheetName]);

  useEffect(() => {
    if (isProjectChangedByUser && hasUnsavedChangesRef.current) {
      unsavedChangesVersionRef.current = projectVersion;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectVersion]);

  const onEditorReady = useCallback(() => {
    if (!hasUnsavedChangesRef.current) {
      codeRef.current = sheetContent || '';
      setCode.current?.(codeRef.current);
    }
  }, [hasUnsavedChangesRef, sheetContent]);

  const updateHasUnsavedChanges = useCallback(
    (value: boolean) => {
      // We are changing project save version if we don't have unsaved changes state
      if (value && !hasUnsavedChangesRef.current) {
        unsavedChangesVersionRef.current = projectVersion ?? null;
      }

      hasUnsavedChangesRef.current = value;
      showHasUnsavedChanges(value);
    },
    [projectVersion, showHasUnsavedChanges]
  );

  const onCodeChange = useCallback(
    (code: string) => {
      const normalizedCodeRefValue = getNormalizedValue(codeRef.current);
      const normalizedNewValue = getNormalizedValue(code);
      const normalizedSheetContent = getNormalizedValue(sheetContent || '');

      if (
        normalizedNewValue === normalizedSheetContent &&
        hasUnsavedChangesRef.current
      ) {
        updateHasUnsavedChanges(false);
      }

      if (!projectVersion || normalizedCodeRefValue === normalizedNewValue)
        return;

      codeRef.current = code;

      if (normalizedNewValue === normalizedSheetContent) return;

      const isUserChange = isCodeEditorMonacoInputFocused();
      if (!hasUnsavedChangesRef.current && isUserChange) {
        updateHasUnsavedChanges(true);
      }
    },
    [sheetContent, projectVersion, updateHasUnsavedChanges]
  );

  const onSave = useCallback(() => {
    const normalizedSheetContent = getNormalizedValue(sheetContent || '');
    const normalizedCodeRefValue = getNormalizedValue(codeRef.current);

    if (
      !projectName ||
      !sheetName ||
      !projectSheets ||
      normalizedCodeRefValue === normalizedSheetContent ||
      !hasUnsavedChangesRef.current
    )
      return;

    let sendPutRequest = true;
    if (unsavedChangesVersionRef.current !== projectVersion) {
      // eslint-disable-next-line no-console
      console.log('Showing override project banner from code editor', {
        'unsavedChangesVersion !== projectVersion':
          unsavedChangesVersionRef.current !== projectVersion,
        unsavedChangesVersion: unsavedChangesVersionRef.current,
        projectVersion,
      });
      initConflictResolving();
      sendPutRequest = false;
    }

    let updatedSheetContent = autoRenameTables(
      codeRef.current,
      sheetName,
      projectSheets
    );
    updatedSheetContent = autoRenameFields(updatedSheetContent);
    updatedSheetContent = autoTablePlacement(
      updatedSheetContent,
      viewGridData.getGridTableStructure(),
      gridApi,
      null,
      null
    );
    updatedSheetContent = autoFunctionsToUppercase(
      updatedSheetContent,
      functions
    );
    updatedSheetContent = autoFixSheetTableOrFieldName(
      updatedSheetContent,
      parsedSheets
    );

    updatedSheetContent = stripNewLinesAtEnd(updatedSheetContent) + newLine;

    codeRef.current = updatedSheetContent;
    setCode.current?.(updatedSheetContent, true);
    updateHasUnsavedChanges(false);

    manuallyUpdateSheetContent(
      [{ sheetName, content: updatedSheetContent }],
      sendPutRequest
    );

    gridApi?.clearSelection();

    const historyTitle = getDSLChangeText(
      sheetContent || '',
      updatedSheetContent
    );

    appendTo(historyTitle, [{ sheetName, content: updatedSheetContent }]);
  }, [
    sheetContent,
    projectName,
    sheetName,
    projectSheets,
    projectVersion,
    viewGridData,
    gridApi,
    functions,
    parsedSheets,
    updateHasUnsavedChanges,
    manuallyUpdateSheetContent,
    appendTo,
    initConflictResolving,
  ]);

  const onGoToTable = useCallback(
    (tableName: string) => {
      if (!sheetName) return;

      if (expandedPanelSide) {
        toggleExpandPanel(PanelName.CodeEditor);
        setTimeout(() => {
          openTable(sheetName, tableName);
        }, 10);

        return;
      }
      openTable(sheetName, tableName);
    },
    [expandedPanelSide, openTable, sheetName, toggleExpandPanel]
  );

  const onGoToField = useCallback(
    (tableName: string, fieldName: string) => {
      if (!sheetName) return;

      if (expandedPanelSide) {
        toggleExpandPanel(PanelName.CodeEditor);

        setTimeout(() => {
          openField(sheetName, tableName, fieldName);
        }, 10);

        return;
      }
      openField(sheetName, tableName, fieldName);
    },
    [expandedPanelSide, openField, sheetName, toggleExpandPanel]
  );

  return (
    <div
      className="h-[calc(100%-20px)] w-full pt-5 bg-bgLayer3"
      id={codeEditorId}
    >
      <CodeEditor
        codeEditorPlace="codeEditor"
        errors={errors}
        functions={functions}
        language="code-editor"
        options={{
          readOnly:
            (isAIPendingChanges && !isAIEditPendingChanges) ||
            !isProjectEditable,
          readOnlyMessage: isAIPendingChanges
            ? {
                value: disabledTooltips.pendingAIChanges,
              }
            : !isProjectEditable
            ? {
                value: disabledTooltips.readonlyProject,
              }
            : undefined,
        }}
        parsedSheets={parsedSheets}
        setCode={setCode}
        sheetContent={sheetContent || ''}
        theme={theme}
        onBlur={onSave}
        onCodeChange={onCodeChange}
        onEditorReady={onEditorReady}
        onGoToField={onGoToField}
        onGoToTable={onGoToTable}
        onSaveButton={onSave}
      />
    </div>
  );
}
