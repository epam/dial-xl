import { useCallback, useContext, useEffect, useState } from 'react';

import { editor, MarkerSeverity } from '@frontend/code-editor';
import {
  CompilationError,
  EvaluationError,
  RuntimeError,
} from '@frontend/common';

import { ProjectContext } from '../context';
import { calculateSheetErrorPosition } from '../utils';
import { useDSLUtils } from './EditDsl';

type ErrorPosition = ReturnType<typeof calculateSheetErrorPosition> | null;

export function useDSLErrors() {
  const { sheetErrors, compilationErrors, runtimeErrors, sheetName } =
    useContext(ProjectContext);
  const { findEditContext } = useDSLUtils();

  const [errors, setErrors] = useState<editor.IMarkerData[]>([]);

  const getCodeEditorErrorPosition = useCallback(
    (error: EvaluationError, checkSheet = true): ErrorPosition => {
      const isContextValid = (context: ReturnType<typeof findEditContext>) =>
        context && (!checkSheet || context.sheetName === sheetName);

      if ('tableKey' in error && error.tableKey) {
        const { table } = error.tableKey;
        const context = findEditContext(table);

        if (!isContextValid(context) || !context?.parsedTable) return null;

        const { sheetContent, parsedTable } = context;
        const { span, text } = parsedTable.name;

        return calculateSheetErrorPosition(sheetContent, text, span.to);
      }

      if ('fieldKey' in error && error.fieldKey) {
        const { table, field } = error.fieldKey;
        const context = findEditContext(table, field);

        if (
          !isContextValid(context) ||
          !context?.parsedField?.expressionMetadata
        )
          return null;

        const { sheetContent } = context;
        const { text, end } = context.parsedField.expressionMetadata;

        return calculateSheetErrorPosition(sheetContent, text, end);
      }

      if ('totalKey' in error && error.totalKey) {
        const { table, field, number } = error.totalKey;
        const context = findEditContext(table, field);

        if (!isContextValid(context) || !context?.parsedTable?.totals)
          return null;

        const { totals } = context.parsedTable;

        if (number < 1 || number > totals.length) return null;

        const totalRow = totals[number - 1];
        const totalField = totalRow?.fields?.find((f) =>
          f.fields.find((ff) => ff.key.fieldName === field)
        );

        if (!totalField?.formula || !totalField?.span) return null;

        return calculateSheetErrorPosition(
          context.sheetContent,
          totalField.formula.text,
          totalField.span.to
        );
      }

      if ('overrideKey' in error && error.overrideKey) {
        const { table, field, row } = error.overrideKey;
        const context = findEditContext(table, field);

        if (!isContextValid(context) || !context?.parsedTable?.overrides)
          return null;

        const { overrides } = context.parsedTable;

        const headerIndex = overrides.getHeaderIndexByFieldName(field);
        const rowIdx = row - 1;

        if (rowIdx < 0 || rowIdx >= overrides.values.length) return null;

        const overrideRowValues = overrides.values[rowIdx];

        if (!Array.isArray(overrideRowValues)) return null;
        if (headerIndex < 0 || headerIndex >= overrideRowValues.length)
          return null;

        const overrideValue = overrideRowValues[headerIndex];

        if (!overrideValue?.span || !overrideValue?.text) return null;

        return calculateSheetErrorPosition(
          context.sheetContent,
          overrideValue.text,
          overrideValue.span.to
        );
      }

      return null;
    },
    [findEditContext, sheetName]
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

    const addError = (error: RuntimeError | CompilationError) => {
      const position = getCodeEditorErrorPosition(error);

      if (position) {
        const { line, startColumn, endColumn } = position;
        const { message } = error;
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

    runtimeErrors?.forEach(addError);
    compilationErrors?.forEach(addError);

    setErrors(errors);
  }, [
    compilationErrors,
    getCodeEditorErrorPosition,
    runtimeErrors,
    sheetErrors,
  ]);

  return {
    errors,
    getCodeEditorErrorPosition,
  };
}
