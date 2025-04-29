import { useContext, useEffect, useState } from 'react';

import { ParsedTable } from '@frontend/parser';

import { ProjectContext } from '../../../context';
import { PanelEmptyMessage } from '../PanelEmptyMessage';
import { ChartOptions } from './ChartOptions';

export function Chart() {
  const { selectedCell, parsedSheet } = useContext(ProjectContext);
  const [parsedTable, setParsedTable] = useState<ParsedTable | null>(null);

  useEffect(() => {
    if (!selectedCell) {
      setParsedTable(null);

      return;
    }

    const timeoutId = setTimeout(() => {
      const foundTable = parsedSheet?.tables.find(
        (t) => t.tableName === selectedCell.tableName
      );
      setParsedTable(foundTable && foundTable.isChart() ? foundTable : null);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [parsedSheet, selectedCell]);

  return (
    <div className="w-full h-full overflow-auto thin-scrollbar bg-bgLayer3">
      {parsedTable ? (
        <ChartOptions parsedTable={parsedTable} />
      ) : (
        <PanelEmptyMessage message="No chart selected." />
      )}
    </div>
  );
}
