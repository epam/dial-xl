import { useCallback, useContext, useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  CodeEditorContext,
  CompilationError,
  CompileErrorIcon,
  getKeyLabelFromError,
  IndexError,
  RowsIcon,
  RuntimeError,
  RuntimeErrorIcon,
} from '@frontend/common';

import { PanelName } from '../../../common';
import { LayoutContext } from '../../../context';
import { useDSLErrors } from '../../../hooks';

interface Props {
  error: CompilationError | RuntimeError | IndexError;
  errorType: 'compile' | 'runtime' | 'index';
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

  const errorIcon = useMemo(() => {
    if (errorType === 'compile') {
      return <CompileErrorIcon />;
    } else if (errorType === 'runtime') {
      return <RuntimeErrorIcon />;
    }

    return <RowsIcon />;
  }, [errorType]);

  const iconTitle = useMemo(() => {
    if (errorType === 'compile') {
      return 'Compile error';
    } else if (errorType === 'runtime') {
      return 'Runtime error';
    }

    return 'Index error';
  }, [errorType]);

  return (
    <div className="mt-1 p-1 bg-bgError rounded-[3px]">
      <div className="flex">
        <Icon
          className="mt-[3px] shrink-0 size-[18px] text-textError mx-2"
          component={() => errorIcon}
          title={iconTitle}
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
