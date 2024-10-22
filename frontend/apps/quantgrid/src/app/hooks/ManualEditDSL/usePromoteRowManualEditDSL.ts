import { useCallback, useContext } from 'react';

import { defaultFieldName } from '@frontend/common';
import {
  hideTableFieldsDecoratorName,
  newLine,
  overrideKeyword,
  unescapeOverrideValue,
} from '@frontend/parser';

import { ProjectContext } from '../../context';
import { createUniqueName } from '../../services';
import { useDSLUtils } from './useDSLUtils';

export function usePromoteRowManualEditDSL() {
  const { sheetContent, projectName } = useContext(ProjectContext);
  const { updateDSL, findTable } = useDSLUtils();

  const promoteRow = useCallback(
    (tableName: string, dataIndex: number) => {
      const table = findTable(tableName);

      if (
        !table?.dslOverridePlacement ||
        !table?.overrides ||
        !sheetContent ||
        !projectName
      )
        return;

      const { overrides, dslOverridePlacement, fields, decorators } = table;

      if (overrides.getSize() <= 1) return;

      const hideFieldsHeaderDecorator = decorators.find(
        (decorator) => decorator.decoratorName === hideTableFieldsDecoratorName
      );
      let decoratorStart = 0;
      let decoratorEnd = 0;
      if (hideFieldsHeaderDecorator) {
        const { dslPlacement } = hideFieldsHeaderDecorator;
        decoratorStart = dslPlacement?.start ?? 0;
        decoratorEnd = dslPlacement?.end ?? 0;
      }

      const { startOffset, stopOffset } = dslOverridePlacement;

      const fieldsMapping: Record<string, string> = {};

      fields.forEach((field) => {
        const currentFieldName = field.key.fieldName;
        const overrideValue = overrides.getValueAtIndex(
          currentFieldName,
          dataIndex
        );

        if (overrideValue !== null) {
          const sanitizedNewName = unescapeOverrideValue(
            overrideValue.toString()
          );

          const uniqueNewFieldName = createUniqueName(
            sanitizedNewName || defaultFieldName,
            Object.values(fieldsMapping)
          );
          fieldsMapping[currentFieldName] = uniqueNewFieldName;

          overrides.renameField(currentFieldName, uniqueNewFieldName);
        }
      });

      overrides.removeRow(dataIndex);

      const reversedFieldsByPlacement = fields.sort((a, b) => {
        if (!a.dslFieldNamePlacement || !b.dslFieldNamePlacement) return 0;

        return b.dslFieldNamePlacement.start - a.dslFieldNamePlacement.start;
      });

      const updatedOverride = overrides.convertToDsl();

      let updatedSheetContent =
        sheetContent.substring(0, startOffset) +
        `${overrideKeyword}${newLine}${updatedOverride}${newLine}${newLine}` +
        sheetContent.substring(stopOffset + 1);

      reversedFieldsByPlacement.forEach((field) => {
        const newFieldName = fieldsMapping[field.key.fieldName];

        if (newFieldName && field.dslFieldNamePlacement) {
          const { end, start } = field.dslFieldNamePlacement;

          updatedSheetContent =
            updatedSheetContent.substring(0, start) +
            `[${newFieldName}]` +
            updatedSheetContent.substring(end);
        }
      });

      updatedSheetContent =
        updatedSheetContent.substring(0, decoratorStart) +
        updatedSheetContent.substring(decoratorEnd);

      const historyTitle = `Set row ${dataIndex} in table ${tableName} as field headers`;
      updateDSL(updatedSheetContent, historyTitle);
    },
    [findTable, projectName, sheetContent, updateDSL]
  );

  return {
    promoteRow,
  };
}
