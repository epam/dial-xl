import { useCallback, useContext } from 'react';

import { CodeEditorContext, ParsingError } from '@frontend/common';

import { ProjectContext } from '../../context';

function getErrorLink(error: ParsingError): string {
  if (!error.position) {
    return `${error.line}: `;
  }

  return `${error.line}:${error.position}: `;
}

export function Errors() {
  const { sheetErrors, compilationErrors } = useContext(ProjectContext);
  const { updateSelectedError } = useContext(CodeEditorContext);

  const onErrorClick = useCallback(
    (error: ParsingError) => {
      updateSelectedError(error);
    },
    [updateSelectedError]
  );

  const isSheetErrors = sheetErrors && sheetErrors.length > 0;
  const isCompilationErrors = compilationErrors && compilationErrors.length > 0;

  if (!isSheetErrors && !isCompilationErrors) {
    return <span className="w-full text-center pt-3">No errors</span>;
  }

  return (
    <div className="w-full h-full px-2 overflow-auto">
      {sheetErrors?.map((error, index) => (
        <div className="mt-2" key={index}>
          <span
            className="text-blue-800 text-sm hover:underline cursor-pointer"
            onClick={() => onErrorClick(error)}
          >
            {getErrorLink(error)}
          </span>
          <span className="text-sm">{error.message}</span>
        </div>
      ))}
      {compilationErrors?.map((error, index) => (
        <div className="mt-2" key={index}>
          <span className="text-sm">
            Compile error at {error.tableName}[{error.fieldName}]:{' '}
            {error.message}
          </span>
        </div>
      ))}
    </div>
  );
}
