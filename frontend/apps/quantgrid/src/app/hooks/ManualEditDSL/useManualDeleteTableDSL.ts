import { useCallback, useContext } from 'react';

import { newLine } from '@frontend/parser';

import { ProjectContext } from '../../context';
import { useDSLUtils } from './useDSLUtils';

export function useManualDeleteTableDSL() {
  const { projectName } = useContext(ProjectContext);
  const { updateDSL, findContext } = useDSLUtils();

  const deleteTable = useCallback(
    (tableName: string) => {
      const context = findContext(tableName);

      if (!context || !projectName) return;

      const { table, sheetContent, sheetName } = context;

      if (!table?.dslPlacement) return;

      const { startOffset, stopOffset } = table.dslPlacement;

      const updatedSheetContent =
        sheetContent.substring(0, startOffset) +
        sheetContent.substring(stopOffset + 1).replace(newLine, '');

      const historyTitle = `Delete table "${tableName}"`;
      updateDSL(updatedSheetContent, historyTitle, sheetName);
    },
    [projectName, updateDSL, findContext]
  );
  const deleteTables = useCallback(
    (tableNames: string[]) => {
      const contexts = tableNames
        .map((name) => findContext(name))
        .filter(Boolean)
        .filter((context) => !!context?.table.dslPlacement);

      if (!contexts.length || !projectName) return;

      const deleteOffsetsBySheetName = contexts.reduce((acc, current) => {
        if (current) {
          const { table } = current;
          const dslOffsets = acc[current.sheetName] ?? [];

          if (!table.dslPlacement) {
            return acc;
          }

          dslOffsets.push([
            table.dslPlacement.startOffset,
            table.dslPlacement.stopOffset,
          ]);

          acc[current.sheetName] = dslOffsets;
        }

        return acc;
      }, {} as Record<string, [number, number][]>);

      Object.entries(deleteOffsetsBySheetName).forEach(
        ([sheetName, deleteOffsets]) => {
          const sheetContent = contexts.find(
            (context) => context?.sheetName === sheetName
          )?.sheetContent;
          if (!sheetContent) return undefined;

          let updatedSheetContent = sheetContent;
          deleteOffsets.forEach(([startOffset, stopOffset]) => {
            // Replace tables content with special character which we will replace by one operation later
            const replacedSubstring = new Array(
              stopOffset - startOffset + 1
            ).fill('\0');
            updatedSheetContent =
              updatedSheetContent.substring(0, startOffset) +
              replacedSubstring.join('') +
              updatedSheetContent
                .substring(stopOffset + 1)
                .replace(newLine, '\0\0');
          });

          updatedSheetContent = updatedSheetContent.replaceAll('\0', '');

          const historyTitle = `Delete tables ${tableNames
            .map((tableName) => `"${tableName}"`)
            .join(', ')}`;
          updateDSL(updatedSheetContent, historyTitle, sheetName);
        }
      );
    },
    [projectName, updateDSL, findContext]
  );

  return {
    deleteTable,
    deleteTables,
  };
}
