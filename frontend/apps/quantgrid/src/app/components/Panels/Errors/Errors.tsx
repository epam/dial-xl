import { useContext } from 'react';

import { CompileErrorIcon } from '@frontend/common';

import { ProjectContext } from '../../../context';
import { PanelEmptyMessage } from '../PanelEmptyMessage';
import { ErrorItem } from './ErrorItem';

export function Errors() {
  const { sheetErrors, compilationErrors, runtimeErrors, indexErrors } =
    useContext(ProjectContext);

  const hasErrors = [
    sheetErrors,
    compilationErrors,
    runtimeErrors,
    indexErrors,
  ].some((e) => e && e?.length > 0);

  if (!hasErrors) {
    return (
      <PanelEmptyMessage icon={<CompileErrorIcon />} message="No errors" />
    );
  }

  return (
    <div className="w-full h-full p-1 overflow-auto thin-scrollbar bg-bg-layer-3">
      {sheetErrors?.map((error, index) => (
        <ErrorItem error={error} errorType="parsing" key={index} />
      ))}

      {compilationErrors?.map((error, index) => (
        <ErrorItem error={error} errorType="compile" key={index} />
      ))}

      {runtimeErrors?.map((error, index) => (
        <ErrorItem error={error} errorType="runtime" key={index} />
      ))}

      {indexErrors?.map((error, index) => (
        <ErrorItem error={error} errorType="index" key={index} />
      ))}
    </div>
  );
}
