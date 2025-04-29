import { useCallback, useContext } from 'react';

import Icon from '@ant-design/icons';
import {
  CodeEditorContext,
  ParsingError,
  ParsingErrorIcon,
} from '@frontend/common';

import { PanelName } from '../../../common';
import { LayoutContext, ProjectContext } from '../../../context';
import { PanelEmptyMessage } from '../PanelEmptyMessage';
import { CompileOrRuntimeError } from './CompileOrRuntimeError';

function getParsingErrorLink(error: ParsingError): string {
  if (!error.source.startColumn) {
    return `${error.source.startLine}: `;
  }

  return `${error.source.startLine}:${error.source.startColumn}: `;
}

export function Errors() {
  const { sheetErrors, compilationErrors, runtimeErrors } =
    useContext(ProjectContext);
  const { updateSelectedError } = useContext(CodeEditorContext);
  const { openPanel } = useContext(LayoutContext);

  const onParsingErrorClick = useCallback(
    (error: ParsingError) => {
      openPanel(PanelName.CodeEditor);
      updateSelectedError(error);
    },
    [openPanel, updateSelectedError]
  );

  const isSheetErrors = sheetErrors && sheetErrors.length > 0;
  const isCompilationErrors = compilationErrors && compilationErrors.length > 0;
  const isRuntimeErrors = runtimeErrors && runtimeErrors.length > 0;

  if (!isSheetErrors && !isCompilationErrors && !isRuntimeErrors) {
    return <PanelEmptyMessage message="No errors" />;
  }

  return (
    <div className="w-full h-full p-1 overflow-auto thin-scrollbar bg-bgLayer3">
      {sheetErrors?.map((error, index) => (
        <div className="mt-1 p-1 bg-bgError rounded-[3px]" key={index}>
          <div className="flex">
            <Icon
              className="shrink-0 block mt-[3px] text-textError mx-2 w-[18px]"
              component={() => <ParsingErrorIcon />}
              title="Parsing error"
            />
            <div className="pr-2">
              <span
                className="text-textError font-semibold text-[13px] [overflow-wrap:anywhere] hover:underline cursor-pointer"
                onClick={() => onParsingErrorClick(error)}
              >
                {getParsingErrorLink(error)}
              </span>
              <span className="text-[13px] text-textPrimary [overflow-wrap:anywhere]">
                {error.message}
              </span>
            </div>
          </div>
        </div>
      ))}

      {compilationErrors?.map((error, index) => (
        <CompileOrRuntimeError error={error} errorType="compile" key={index} />
      ))}

      {runtimeErrors?.map((error, index) => (
        <CompileOrRuntimeError error={error} errorType="runtime" key={index} />
      ))}
    </div>
  );
}
