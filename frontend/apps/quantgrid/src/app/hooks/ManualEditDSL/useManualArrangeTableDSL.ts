import { useCallback, useContext } from 'react';

import { TableArrangeType } from '@frontend/common';
import { newLine } from '@frontend/parser';

import { ProjectContext, ViewportContext } from '../../context';
import { findNearestOverlappingTable } from '../../services';
import { useDSLUtils } from './useDSLUtils';

export function useManualArrangeTableDSL() {
  const { parsedSheet, projectName, sheetContent } = useContext(ProjectContext);
  const { viewGridData } = useContext(ViewportContext);
  const { updateDSL, findTable } = useDSLUtils();

  const arrangeTable = useCallback(
    (tableName: string, arrangeType: TableArrangeType) => {
      if (!projectName || !sheetContent) return;

      const targetParsedTable = findTable(tableName);

      if (!targetParsedTable?.dslPlacement) return;

      const { startOffset, stopOffset } = targetParsedTable.dslPlacement;
      const tableStructures = viewGridData.getGridTableStructure();
      const doubleNewLine = newLine + newLine;

      const targetTableDSL = sheetContent
        .substring(startOffset, stopOffset)
        .trim();
      const dslWithoutTable =
        sheetContent.substring(0, startOffset).trim() +
        sheetContent.substring(stopOffset).trim();

      let updatedSheetContent = '';

      if (arrangeType === 'back') {
        updatedSheetContent = targetTableDSL + doubleNewLine + dslWithoutTable;
      }

      if (arrangeType === 'front') {
        updatedSheetContent = dslWithoutTable + doubleNewLine + targetTableDSL;
      }

      if (arrangeType === 'forward' || arrangeType === 'backward') {
        const isForward = arrangeType === 'forward';
        const targetGridTable = tableStructures.find(
          (table) => table.tableName === tableName
        );

        if (!targetGridTable || !parsedSheet?.tables) return;

        const overlappingTable = findNearestOverlappingTable(
          targetGridTable,
          targetParsedTable,
          tableStructures,
          parsedSheet.tables,
          isForward
        );

        if (!overlappingTable?.dslPlacement) return;

        const otherStartOffset = overlappingTable.dslPlacement.startOffset;
        const otherStopOffset = overlappingTable.dslPlacement.stopOffset;

        if (isForward) {
          const sheetWithTargetTableInNewPosition =
            sheetContent.substring(0, otherStopOffset).trimEnd() +
            doubleNewLine +
            targetTableDSL +
            doubleNewLine +
            sheetContent.substring(otherStopOffset).trimStart();

          updatedSheetContent =
            sheetWithTargetTableInNewPosition
              .substring(0, startOffset)
              .trimEnd() +
            doubleNewLine +
            sheetWithTargetTableInNewPosition.substring(stopOffset).trimStart();
        } else {
          const sheetContentWithoutTargetTable =
            sheetContent.substring(0, startOffset) +
            sheetContent.substring(stopOffset);
          updatedSheetContent =
            sheetContentWithoutTargetTable
              .substring(0, otherStartOffset)
              .trimEnd() +
            doubleNewLine +
            targetTableDSL +
            doubleNewLine +
            sheetContentWithoutTargetTable
              .substring(otherStartOffset)
              .trimStart();
        }
      }

      const historyTitle = `Table "${tableName}" moved ${arrangeType}`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [projectName, sheetContent, findTable, viewGridData, updateDSL, parsedSheet]
  );

  return {
    arrangeTable,
  };
}
