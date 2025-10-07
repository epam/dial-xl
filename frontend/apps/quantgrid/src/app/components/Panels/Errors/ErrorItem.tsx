import { useCallback, useContext, useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  CodeEditorContext,
  CompilationError,
  CompileErrorIcon,
  EvaluationError,
  IndexError,
  ParsingError,
  ParsingErrorIcon,
  RowsIcon,
  RuntimeError,
  RuntimeErrorIcon,
} from '@frontend/common';

import { PanelName } from '../../../common';
import {
  AppSpreadsheetInteractionContext,
  LayoutContext,
  ProjectContext,
} from '../../../context';
import { useDSLErrors } from '../../../hooks';
import {
  getErrorLocationInfo,
  getLabelFromError,
  getLabelFromParsingError,
} from '../../../utils';

interface Props {
  error: EvaluationError;
  errorType: 'compile' | 'runtime' | 'index' | 'parsing';
}

const errorItemConfig = {
  compile: {
    icon: <CompileErrorIcon />,
    title: 'Compile error',
  },
  runtime: {
    icon: <RuntimeErrorIcon />,
    title: 'Runtime error',
  },
  parsing: {
    icon: <ParsingErrorIcon />,
    title: 'Parsing error',
  },
  index: {
    icon: <RowsIcon />,
    title: 'Index error',
  },
} as const;

export function ErrorItem({ error, errorType }: Props) {
  const { parsedSheets, sheetName } = useContext(ProjectContext);
  const { openedPanels, openPanel } = useContext(LayoutContext);
  const { openTable, openField } = useContext(AppSpreadsheetInteractionContext);
  const { updateSelectedError } = useContext(CodeEditorContext);
  const { getCodeEditorErrorPosition } = useDSLErrors();

  const handleErrorClick = useCallback(() => {
    const { message } = error;

    const locationInfo = getErrorLocationInfo(error, parsedSheets);

    if (!locationInfo || !sheetName) {
      // Case where the error has only source info (parsing error)
      if ('source' in error) {
        openPanel(PanelName.CodeEditor);
        updateSelectedError(error as ParsingError);
      }

      return;
    }

    const { tableName, fieldName, sheetName: targetSheet } = locationInfo;

    const sheetToOpen =
      targetSheet && targetSheet !== sheetName ? targetSheet : sheetName;

    if (fieldName) {
      openField(sheetToOpen, tableName, fieldName);
    } else {
      openTable(sheetToOpen, tableName);
    }

    if (!openedPanels.editor.isActive && !fieldName) {
      openPanel(PanelName.CodeEditor);
    }

    if (errorType === 'parsing') {
      updateSelectedError(error as ParsingError);
    } else if (fieldName) {
      const errorPosition = getCodeEditorErrorPosition(error, false);

      if (!errorPosition) return;

      const source = 'source' in error ? error.source : {};
      updateSelectedError({
        source: {
          ...source,
          startColumn: errorPosition.startColumn,
          startLine: errorPosition.line,
        },
        message,
      });
    }
  }, [
    error,
    parsedSheets,
    sheetName,
    errorType,
    openedPanels.editor.isActive,
    openTable,
    openField,
    updateSelectedError,
    openPanel,
    getCodeEditorErrorPosition,
  ]);

  const { icon: errorIcon, title: iconTitle } = useMemo(
    () => errorItemConfig[errorType],
    [errorType]
  );

  const errorLabel = useMemo(
    () =>
      errorType === 'parsing'
        ? getLabelFromParsingError(error as ParsingError)
        : getLabelFromError(
            error as CompilationError | RuntimeError | IndexError
          ) || '[]',
    [error, errorType]
  );

  return (
    <div className="mt-1 p-1 bg-bg-error rounded-[3px]">
      <div className="flex">
        <Icon
          className="mt-[3px] shrink-0 size-[18px] text-text-error mx-2"
          component={() => errorIcon}
          title={iconTitle}
        />
        <div className="pr-2">
          <span
            className="text-text-error font-semibold text-[13px] wrap-anywhere hover:underline cursor-pointer"
            onClick={handleErrorClick}
          >
            {errorLabel}
            {errorType !== 'parsing' && '\u00A0'}
          </span>
          <span className="text-[13px] text-text-primary wrap-anywhere">
            {error.message}
          </span>
        </div>
      </div>
    </div>
  );
}
