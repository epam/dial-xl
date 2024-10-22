import { useCallback, useContext } from 'react';

import { PanelName } from '../common';
import { ProjectContext } from '../context';

export function usePanelStatusBar() {
  const { sheetErrors, compilationErrors } = useContext(ProjectContext);

  const isSheetErrors = sheetErrors && sheetErrors.length > 0;
  const isCompilationErrors = compilationErrors && compilationErrors.length > 0;

  const showErrorNotification = useCallback(
    (panelName: PanelName) => {
      return !!(
        panelName === PanelName.Errors &&
        (isSheetErrors || isCompilationErrors)
      );
    },
    [isCompilationErrors, isSheetErrors]
  );

  return {
    showErrorNotification,
  };
}
