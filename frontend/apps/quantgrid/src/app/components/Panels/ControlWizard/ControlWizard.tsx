import { useContext, useMemo } from 'react';

import { ParsedTable } from '@frontend/parser';

import { ProjectContext } from '../../../context';
import {
  CreateControlWizard,
  EditControlWizard,
  TableOption,
} from './components';

export function ControlWizard({
  parsedTable,
}: {
  parsedTable: ParsedTable | null;
}) {
  const { parsedSheets } = useContext(ProjectContext);

  const tables: TableOption[] = useMemo(() => {
    if (!parsedSheets) return [];

    const res: TableOption[] = [];

    for (const sheet of Object.values(parsedSheets)) {
      const filteredTables = sheet.tables.filter((t) => !t.isControl());

      for (const table of filteredTables) {
        res.push({
          value: table.tableName,
          label: table.tableName,
          fields: table.fields
            .filter((f) => !f.isDynamic)
            .map(({ key }) => ({
              value: key.fieldName,
              label: key.fieldName,
            })),
        });
      }
    }

    return res;
  }, [parsedSheets]);

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div className="flex flex-col w-full overflow-auto thin-scrollbar bg-bg-layer-3 grow">
        {parsedTable ? (
          <EditControlWizard parsedTable={parsedTable} tables={tables} />
        ) : (
          <CreateControlWizard tables={tables} />
        )}
      </div>
    </div>
  );
}
