import { useCallback, useContext } from 'react';

import Icon from '@ant-design/icons';
import {
  CodeEditorContext,
  CompilationError,
  CompileErrorIcon,
  getKeyLabelFromError,
  RuntimeError,
  RuntimeErrorIcon,
} from '@frontend/common';

import { useDSLErrors } from '../../../hooks';

interface Props {
  error: CompilationError | RuntimeError;
  errorType: 'compile' | 'runtime';
}

export function CompileOrRuntimeError({ error, errorType }: Props) {
  const { updateSelectedError } = useContext(CodeEditorContext);
  const { getCodeEditorExpressionPosition } = useDSLErrors();

  const onCompilationOrRuntimeErrorClick = useCallback(
    (error: CompilationError | RuntimeError) => {
      const { fieldKey, message } = error;

      if (!fieldKey) {
        return;
      }

      const errorPosition = getCodeEditorExpressionPosition(
        fieldKey.table,
        fieldKey.field
      );

      if (!errorPosition) return;

      updateSelectedError({
        ...errorPosition,
        source: {
          ...error.source,
          startColumn: errorPosition.startColumn,
          startLine: errorPosition.line,
        },
        message,
      });
    },
    [getCodeEditorExpressionPosition, updateSelectedError]
  );

  return (
    <div className="mt-1 p-1 bg-bgError rounded-[3px]">
      <div className="flex">
        <Icon
          className="stroke-textError mx-2"
          component={() =>
            errorType === 'compile' ? (
              <CompileErrorIcon />
            ) : (
              <RuntimeErrorIcon />
            )
          }
        />
        <div className="pr-2">
          <span
            className="text-textError font-semibold text-[13px] [overflow-wrap:anywhere] hover:underline cursor-pointer"
            onClick={() => onCompilationOrRuntimeErrorClick(error)}
          >
            {getKeyLabelFromError(error) || '[]'}&nbsp;
          </span>
          <span className="text-[13px] text-textPrimary [overflow-wrap:anywhere]">
            {error.message}
          </span>
        </div>
      </div>
    </div>
  );
}
