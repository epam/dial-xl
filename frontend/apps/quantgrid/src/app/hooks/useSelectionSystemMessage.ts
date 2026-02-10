import { useContext, useEffect, useState } from 'react';

import { GPTState } from '@frontend/common';

import { InputsContext, ProjectContext } from '../context';
import { useViewStore } from '../store';
import { useGridApi } from './useGridApi';

export const useSelectionSystemMessage = () => {
  const gridApi = useGridApi();
  const { inputs } = useContext(InputsContext);
  const { projectName, sheetName, projectSheets } = useContext(ProjectContext);
  const selectedCell = useViewStore((s) => s.selectedCell);

  const [selection, setSelection] = useState<{
    startCol: number;
    startRow: number;
    endRow: number;
    endCol: number;
  } | null>(null);
  const [systemMessageContent, setSystemMessageContent] = useState<GPTState>();

  useEffect(() => {
    if (!projectSheets || !sheetName || !projectName || !gridApi) return;
    const sheets: { [key: string]: string } = {};

    for (const sheet of projectSheets) {
      sheets[sheet.sheetName] = sheet.content;
    }

    const state: GPTState = {
      projectState: {
        sheets,
        inputs,
        currentSheet: sheetName,
        currentProjectName: projectName,
        selection,
        selectedTableName: selectedCell?.tableName,
      },
    };

    setSystemMessageContent(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selection?.startCol,
    selection?.startRow,
    selection?.endCol,
    selection?.endRow,
    inputs,
    projectName,
    projectSheets,
    selectedCell?.tableName,
    sheetName,
  ]);

  useEffect(() => {
    if (!gridApi) return;

    const subscription = gridApi.selection$.subscribe((selection) => {
      setSelection(selection);
    });

    return () => subscription.unsubscribe();
  }, [gridApi]);

  return { systemMessageContent };
};
