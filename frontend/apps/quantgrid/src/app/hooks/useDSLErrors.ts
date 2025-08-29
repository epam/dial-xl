import { useCallback, useContext, useEffect, useState } from 'react';

import { editor, MarkerSeverity } from '@frontend/code-editor';
import { CompilationError, RuntimeError } from '@frontend/common';

import { ProjectContext } from '../context';
import { useDSLUtils } from './EditDsl';

export function useDSLErrors() {
  const { sheetContent, sheetErrors, compilationErrors, runtimeErrors } =
    useContext(ProjectContext);
  const { findTableField } = useDSLUtils();

  const [errors, setErrors] = useState<editor.IMarkerData[]>([]);

  const getCodeEditorExpressionPosition = useCallback(
    (tableName: string, fieldName: string) => {
      const field = findTableField(tableName, fieldName);

      if (!sheetContent || !field || !field.expressionMetadata) return null;

      const { text, end } = field.expressionMetadata;

      const code = sheetContent.substring(0, end + 1);
      const lines = code.split('\n');
      const line = lines.length;
      const fieldLine = lines.at(-1);

      const startColumn = fieldLine?.includes(text)
        ? fieldLine.indexOf(text) + 1
        : 0;
      const endColumn = startColumn + text.length + 1;

      return {
        line,
        startColumn,
        endColumn,
      };
    },
    [sheetContent, findTableField]
  );

  useEffect(() => {
    const errors: editor.IMarkerData[] = [];

    sheetErrors?.forEach((error) => {
      errors.push({
        severity: MarkerSeverity.Error,
        message: error.message,
        startLineNumber: error.source.startLine || 1,
        endLineNumber: error.source.startLine || 1,
        startColumn: error.source.startColumn || 1,
        endColumn: error.source.startColumn || 1,
      });
    });

    const addErrors = (error: RuntimeError | CompilationError) => {
      const { fieldKey, message } = error;
      if (!fieldKey) {
        return;
      }

      const position = getCodeEditorExpressionPosition(
        fieldKey.table,
        fieldKey.field
      );

      if (position) {
        const { line, startColumn, endColumn } = position;
        errors.push({
          severity: MarkerSeverity.Error,
          startLineNumber: line,
          endLineNumber: line,
          startColumn,
          endColumn,
          message,
        });
      }
    };

    runtimeErrors?.forEach(addErrors);
    compilationErrors?.forEach(addErrors);

    setErrors(errors);
  }, [
    compilationErrors,
    getCodeEditorExpressionPosition,
    runtimeErrors,
    sheetErrors,
  ]);

  return {
    errors,
    getCodeEditorExpressionPosition,
  };
}
