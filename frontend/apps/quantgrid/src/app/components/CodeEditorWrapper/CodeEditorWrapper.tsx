import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  CodeEditor,
  editor,
  MarkerSeverity,
  SetCodeRefFunction,
} from '@frontend/code-editor';

import {
  ProjectContext,
  SpreadsheetContext,
  UndoRedoContext,
} from '../../context';
import {
  autoRenameFields,
  autoRenameTables,
  autoTablePlacement,
  getDSLChangeText,
} from '../../services';

export function CodeEditorWrapper() {
  const codeRef = useRef('');
  const [errors, setErrors] = useState<editor.IMarkerData[]>([]);
  const setCode = useRef<SetCodeRefFunction>(null);

  const {
    functions,
    parsedSheets,
    projectName,
    projectSheets,
    sheetName,
    sheetContent,
    sheetErrors,
    updateSheetContent,
  } = useContext(ProjectContext);
  const { gridApi } = useContext(SpreadsheetContext);
  const { append, undo, redo } = useContext(UndoRedoContext);

  useEffect(() => {
    if (!sheetErrors) return;

    if (sheetErrors.length > 0) {
      const errorMarkers = sheetErrors.map((error) => ({
        severity: MarkerSeverity.Error,
        message: error.message,
        startLineNumber: error.line,
        endLineNumber: error.line,
        startColumn: error.position,
        endColumn: error.position,
      }));

      setErrors(errorMarkers);
    } else {
      setErrors([]);
    }
  }, [sheetErrors]);

  useEffect(() => {
    if (sheetName) {
      setCode.current?.(sheetContent || '');
    }

    if (!projectName && !sheetName) {
      setCode.current?.('');
    }
  }, [projectName, sheetContent, sheetName]);

  const onEditorReady = useCallback(() => {
    setCode.current?.(sheetContent || '');
    codeRef.current = sheetContent || '';
  }, [sheetContent]);

  const onCodeChange = useCallback((code: string) => {
    codeRef.current = code;
  }, []);

  const onSave = useCallback(() => {
    if (
      projectName &&
      sheetName &&
      projectSheets &&
      codeRef.current !== sheetContent &&
      gridApi
    ) {
      let updatedSheetContent = autoRenameTables(
        codeRef.current,
        sheetName,
        projectSheets
      );
      updatedSheetContent = autoRenameFields(updatedSheetContent);
      updatedSheetContent = autoTablePlacement(updatedSheetContent);

      codeRef.current = updatedSheetContent;
      setCode.current?.(updatedSheetContent);

      updateSheetContent(sheetName, updatedSheetContent);

      gridApi.clearSelection();

      const dslChangeText = getDSLChangeText(
        sheetContent || '',
        updatedSheetContent
      );

      append(dslChangeText, updatedSheetContent);
    }
  }, [
    projectName,
    projectSheets,
    sheetName,
    sheetContent,
    gridApi,
    updateSheetContent,
    append,
  ]);

  const onUndo = useCallback(() => {
    onSave();
    undo();
  }, [onSave, undo]);

  return (
    <div className="h-full w-full mt-5">
      <CodeEditor
        errors={errors}
        functions={functions}
        language={'code-editor'}
        parsedSheets={parsedSheets}
        setCode={setCode}
        onBlur={onSave}
        onCodeChange={onCodeChange}
        onEditorReady={onEditorReady}
        onRedo={redo}
        onSaveButton={onSave}
        onUndo={onUndo}
      />
    </div>
  );
}
