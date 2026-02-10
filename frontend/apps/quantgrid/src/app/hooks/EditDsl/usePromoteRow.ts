import { useCallback } from 'react';

import { defaultFieldName } from '@frontend/common';
import { unescapeValue } from '@frontend/parser';

import { createUniqueName } from '../../services';
import { useSafeCallback } from '../useSafeCallback';
import { useDSLUtils } from './useDSLUtils';
import { editLayoutDecorator } from './utils';

export function usePromoteRow() {
  const { updateDSL, findEditContext } = useDSLUtils();

  const promoteRow = useCallback(
    (tableName: string, dataIndex: number) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const { fields, overrides } = parsedTable;

      if (!overrides || overrides.getSize() <= 1) return;

      editLayoutDecorator(table, parsedTable, { showFieldHeaders: true });
      const fieldsMapping: Record<string, string> = {};

      fields.forEach((f) => {
        const currentFieldName = f.key.fieldName;
        const overrideValue = overrides.getValueAtIndex(
          currentFieldName,
          dataIndex
        );

        if (overrideValue !== null) {
          const sanitizedNewName = unescapeValue(overrideValue.toString());

          const uniqueNewFieldName = createUniqueName(
            sanitizedNewName || defaultFieldName,
            Object.values(fieldsMapping)
          );
          fieldsMapping[currentFieldName] = uniqueNewFieldName;

          overrides.renameField(currentFieldName, uniqueNewFieldName);

          const field = table.getField(currentFieldName);
          field.name = uniqueNewFieldName;
        }
      });

      overrides.removeRow(dataIndex);
      table.overrides = overrides.applyOverrides();

      const historyTitle = `Set row ${dataIndex} in table ${tableName} as field headers`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  return {
    promoteRow: useSafeCallback(promoteRow),
  };
}
