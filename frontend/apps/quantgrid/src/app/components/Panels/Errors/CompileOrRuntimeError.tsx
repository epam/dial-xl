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

import { PanelName } from '../../../common';
import { LayoutContext } from '../../../context';
import { useDSLErrors } from '../../../hooks';

interface Props {
  error: CompilationError | RuntimeError;
  errorType: 'compile' | 'runtime';
}

export function CompileOrRuntimeError({ error, errorType }: Props) {
  const { openedPanels, openPanel } = useContext(LayoutContext);
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

      if (!openedPanels.editor.isActive) {
        openPanel(PanelName.CodeEditor);
      }

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
    [
      getCodeEditorExpressionPosition,
      openPanel,
      openedPanels.editor.isActive,
      updateSelectedError,
    ]
  );

  return (
    <div className="mt-1 p-1 bg-bgError rounded-[3px]">
      <div className="flex">
        <Icon
          className="mt-[3px] shrink-0 size-[18px] text-textError mx-2"
          component={() =>
            errorType === 'compile' ? (
              <CompileErrorIcon />
            ) : (
              <RuntimeErrorIcon />
            )
          }
          title={errorType === 'compile' ? 'Compile error' : 'Runtime error'}
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
