import { useContext, useEffect, useState } from 'react';

import { ParsedTable } from '@frontend/parser';

import { PanelProps } from '../../../../common';
import { AppContext, ProjectContext } from '../../../../context';
import { ChartOptions } from '../../Chart';
import { PanelToolbar } from '../../PanelToolbar';
import { PivotTableWizard } from '../../PivotTableWizard';
import { PivotWizardContextProvider } from '../../PivotTableWizard';
import { TableDetails } from '../../TableDetails';
import { PanelWrapper } from '../PanelWrapper';
import { DetailsPanelInitialView } from './DetailsPanelInitialView';

export function DetailsPanel({
  panelName,
  title,
  position,
  isActive,
}: PanelProps) {
  const { pivotTableWizardMode, changePivotTableWizardMode, pivotTableName } =
    useContext(AppContext);
  const { selectedCell, parsedSheet } = useContext(ProjectContext);
  const [selectedParsedTable, setSelectedParsedTable] =
    useState<ParsedTable | null>(null);

  useEffect(() => {
    if (!selectedCell) {
      setSelectedParsedTable(null);
      changePivotTableWizardMode(null);

      return;
    }

    const timeoutId = setTimeout(() => {
      const foundTable = parsedSheet?.tables.find(
        ({ tableName }) => tableName === selectedCell.tableName
      );

      setSelectedParsedTable(foundTable || null);

      if (
        (pivotTableWizardMode === 'edit' &&
          pivotTableName !== foundTable?.tableName) ||
        (foundTable && pivotTableWizardMode === 'create')
      ) {
        changePivotTableWizardMode(null);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [
    changePivotTableWizardMode,
    parsedSheet,
    pivotTableName,
    pivotTableWizardMode,
    selectedCell,
  ]);

  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar panelName={panelName} position={position} title={title} />
      {pivotTableWizardMode ? (
        <PivotWizardContextProvider>
          <PivotTableWizard />
        </PivotWizardContextProvider>
      ) : selectedParsedTable && !selectedParsedTable.isChart() ? (
        <TableDetails parsedTable={selectedParsedTable} />
      ) : (
        <div className="flex flex-col w-full h-full overflow-auto thin-scrollbar bg-bg-layer-3">
          {selectedParsedTable && selectedParsedTable.isChart() ? (
            <ChartOptions parsedTable={selectedParsedTable} />
          ) : (
            <DetailsPanelInitialView />
          )}
        </div>
      )}
    </PanelWrapper>
  );
}
