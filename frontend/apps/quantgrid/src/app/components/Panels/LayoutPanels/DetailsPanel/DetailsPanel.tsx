import { useContext, useEffect, useState } from 'react';

import { ParsedTable } from '@frontend/parser';

import { PanelProps } from '../../../../common';
import { AppContext, ProjectContext } from '../../../../context';
import { ChartOptions } from '../../Chart';
import { PanelToolbar } from '../../PanelToolbar';
import { PivotTableWizard } from '../../PivotTableWizard';
import { PivotWizardContextProvider } from '../../PivotTableWizard';
import { PanelWrapper } from '../PanelWrapper';
import { DetailsPanelInitialView } from './DetailsPanelInitialView';

export function DetailsPanel({
  panelName,
  title,
  position,
  isActive,
}: PanelProps) {
  const { pivotTableWizardMode, changePivotTableWizardMode } =
    useContext(AppContext);
  const { selectedCell, parsedSheet } = useContext(ProjectContext);
  const [chartParsedTable, setChartParsedTable] = useState<ParsedTable | null>(
    null
  );

  useEffect(() => {
    if (!selectedCell) {
      setChartParsedTable(null);

      return;
    }

    const timeoutId = setTimeout(() => {
      const foundTable = parsedSheet?.tables.find(
        (t) => t.tableName === selectedCell.tableName
      );

      const isChart = foundTable?.isChart();

      setChartParsedTable(foundTable && isChart ? foundTable : null);

      if (foundTable && !isChart && foundTable.isPivot) {
        changePivotTableWizardMode('edit', foundTable.tableName);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [changePivotTableWizardMode, parsedSheet, selectedCell]);

  useEffect(() => {
    if (chartParsedTable && pivotTableWizardMode) {
      changePivotTableWizardMode(null);
    }
  }, [pivotTableWizardMode, chartParsedTable, changePivotTableWizardMode]);

  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar panelName={panelName} position={position} title={title} />
      {pivotTableWizardMode ? (
        <PivotWizardContextProvider>
          <PivotTableWizard />
        </PivotWizardContextProvider>
      ) : (
        <div className="flex flex-col w-full h-full overflow-auto thin-scrollbar bg-bgLayer3">
          {chartParsedTable ? (
            <ChartOptions parsedTable={chartParsedTable} />
          ) : (
            <DetailsPanelInitialView />
          )}
        </div>
      )}
    </PanelWrapper>
  );
}
