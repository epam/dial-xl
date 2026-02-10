import { useContext, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { ParsedTable } from '@frontend/parser';

import { PanelProps } from '../../../../common';
import { ProjectContext } from '../../../../context';
import {
  useControlStore,
  usePivotStore,
  useViewStore,
} from '../../../../store';
import { ChartOptions } from '../../Chart';
import { ControlWizard } from '../../ControlWizard';
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
  const { pivotTableName, pivotTableWizardMode, changePivotTableWizardMode } =
    usePivotStore(
      useShallow((s) => ({
        pivotTableName: s.pivotTableName,
        pivotTableWizardMode: s.pivotTableWizardMode,
        changePivotTableWizardMode: s.changePivotTableWizardMode,
      }))
    );
  const controlWizardIsOpen = useControlStore((s) => s.isOpen);
  const openControlCreateWizard = useControlStore(
    (s) => s.openControlCreateWizard
  );
  const closeControlWizard = useControlStore((s) => s.closeControlWizard);

  const { parsedSheet } = useContext(ProjectContext);
  const selectedCell = useViewStore((s) => s.selectedCell);
  const [selectedParsedTable, setSelectedParsedTable] =
    useState<ParsedTable | null>(null);

  useEffect(() => {
    if (!selectedCell) {
      setSelectedParsedTable(null);
      changePivotTableWizardMode(null);
      closeControlWizard();

      return;
    }

    const timeoutId = setTimeout(() => {
      const foundTable = parsedSheet?.tables.find(
        ({ tableName }) => tableName === selectedCell.tableName
      );

      setSelectedParsedTable(foundTable || null);

      if (foundTable) {
        const isControlTable = foundTable.isControl();

        if (isControlTable) {
          openControlCreateWizard();
        } else {
          closeControlWizard();
        }
      } else {
        closeControlWizard();
      }

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
    closeControlWizard,
    changePivotTableWizardMode,
    openControlCreateWizard,
    parsedSheet,
    pivotTableName,
    pivotTableWizardMode,
    selectedCell,
  ]);

  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar
        isActive={isActive}
        panelName={panelName}
        position={position}
        title={title}
      />
      {pivotTableWizardMode ? (
        <PivotWizardContextProvider>
          <PivotTableWizard />
        </PivotWizardContextProvider>
      ) : controlWizardIsOpen ? (
        <ControlWizard parsedTable={selectedParsedTable} />
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
