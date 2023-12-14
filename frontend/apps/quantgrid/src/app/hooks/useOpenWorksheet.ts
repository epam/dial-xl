import { useCallback, useContext } from 'react';

import { ProjectContext } from '../context';
import { useApi } from './useApi';

export function useOpenWorksheet() {
  const { openWorksheet: openWorksheetRequest, closeWorksheet } = useApi();
  const { projectName, sheetName } = useContext(ProjectContext);

  const openWorksheet = useCallback(
    (projectNameToOpen: string, worksheetNameToOpen: string) => {
      if (projectName && sheetName) {
        closeWorksheet(projectName, sheetName);
      }
      openWorksheetRequest(projectNameToOpen, worksheetNameToOpen);
    },
    [closeWorksheet, openWorksheetRequest, projectName, sheetName]
  );

  return openWorksheet;
}
