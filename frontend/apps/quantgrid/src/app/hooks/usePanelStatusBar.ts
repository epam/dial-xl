import { useCallback, useContext } from 'react';

import { PanelName } from '../common';
import { ProjectContext } from '../context';

export function usePanelStatusBar() {
  const { sheetErrors, compilationErrors, runtimeErrors, indexErrors } =
    useContext(ProjectContext);

  const isSheetErrors = sheetErrors && sheetErrors.length > 0;
  const isCompilationErrors = compilationErrors && compilationErrors.length > 0;
  const isRuntimeErrors = runtimeErrors && runtimeErrors.length > 0;
  const isIndexErrors = indexErrors && indexErrors.length > 0;

  const showErrorNotification = useCallback(
    (panelName: PanelName) => {
      return !!(
        panelName === PanelName.Errors &&
        (isSheetErrors ||
          isCompilationErrors ||
          isRuntimeErrors ||
          isIndexErrors)
      );
    },
    [isCompilationErrors, isIndexErrors, isRuntimeErrors, isSheetErrors]
  );

  return {
    showErrorNotification,
  };
}
