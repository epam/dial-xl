import { useCallback, useContext } from 'react';

import {
  collectTableNames,
  dynamicFieldName,
  escapeTableName,
  layoutDecoratorName,
  newLine,
  overrideKeyword,
  OverrideValue,
  ParsedField,
  ParsedTable,
  unescapeTableName,
  updateLayoutDecorator,
} from '@frontend/parser';

import { ProjectContext } from '../../context';
import {
  autoFixSingleExpression,
  createUniqueName,
  sanitizeExpression,
} from '../../services';
import { stripNewLinesAtEnd } from '../../utils';
import { useDSLUtils } from './useDSLUtils';

export function useManualEditDSL() {
  const {
    parsedSheets,
    projectName,
    sheetContent,
    projectSheets,
    functions,
    sheetName,
  } = useContext(ProjectContext);

  const { updateDSL, findContext, findTableInSheet } = useDSLUtils();

  const moveTableToSheet = useCallback(
    (
      tableName: string,
      sourceSheetName: string,
      destinationSheetName: string
    ) => {
      if (!projectName || sourceSheetName === destinationSheetName) return;

      const sourceSheetContent = projectSheets?.find(
        (sheet) => sheet.sheetName === sourceSheetName
      )?.content;
      const destinationSheetContent = projectSheets?.find(
        (sheet) => sheet.sheetName === destinationSheetName
      )?.content;

      if (!sourceSheetContent || typeof destinationSheetContent !== 'string')
        return;

      const targetTable = findTableInSheet(tableName, sourceSheetName);
      if (!targetTable?.dslPlacement) return;

      const tableDsl = sourceSheetContent.substring(
        targetTable.dslPlacement.startOffset,
        targetTable.dslPlacement.stopOffset + 1
      );
      const updatedSourceSheetContent =
        sourceSheetContent.substring(0, targetTable.dslPlacement.startOffset) +
        newLine +
        sourceSheetContent.substring(targetTable.dslPlacement.stopOffset + 1);
      const updatedDestinationSheetContent =
        destinationSheetContent + newLine + tableDsl;

      const historyTitle = `Move table "${tableName}" from sheet "${sourceSheetName}" to sheet "${destinationSheetName}"`;
      updateDSL([
        {
          updatedSheetContent: updatedSourceSheetContent,
          sheetNameToChange: sourceSheetName,
          historyTitle,
          tableName,
        },
        {
          updatedSheetContent: updatedDestinationSheetContent,
          sheetNameToChange: destinationSheetName,
          historyTitle,
          tableName,
        },
      ]);
    },
    [projectName, projectSheets, findTableInSheet, updateDSL]
  );

  const editExpressionWithOverrideRemove = useCallback(
    (
      tableName: string,
      fieldName: string,
      expression: string,
      overrideIndex: number,
      overrideValue: OverrideValue
    ) => {
      const context = findContext(tableName, fieldName);

      if (!projectName || !context || !context.field) return;

      const { table, sheetContent, field } = context;

      let targetField: ParsedField | undefined = field;

      if (field?.isDynamic) {
        targetField = table.fields.find(
          (f) => f.key.fieldName === dynamicFieldName
        );
      }

      if (!targetField?.dslFieldNamePlacement) return;

      const start =
        targetField.expressionMetadata?.start ??
        targetField.dslFieldNamePlacement.end;
      const end =
        targetField.expressionMetadata?.end ??
        targetField.dslFieldNamePlacement.end - 1;

      const sanitizedExpression = sanitizeExpression(
        expression,
        targetField.expressionMetadata?.text ?? ''
      );
      const fixedExpression =
        (!targetField.expressionMetadata ? '= ' : '') +
        autoFixSingleExpression(
          sanitizedExpression,
          functions,
          parsedSheets,
          targetField.key.tableName
        );

      const result = removeOverrideDSL(
        table,
        fieldName,
        overrideIndex,
        overrideValue,
        sheetContent
      );

      if (!result) return;

      if (result.tableRemoved) {
        const { updatedSheetContent, historyTitle } = result;
        updateDSL({ updatedSheetContent, historyTitle, tableName });

        return;
      }

      const updatedSheetContent =
        result.updatedSheetContent.substring(0, start) +
        fixedExpression +
        result.updatedSheetContent.substring(end + 1);

      const historyTitle = `Update expression of column [${fieldName}] in table "${tableName}"`;
      updateDSL({ updatedSheetContent, historyTitle, tableName });

      return true;
    },
    [parsedSheets, projectName, findContext, functions, updateDSL]
  );

  const onCloneTable = useCallback(
    (tableName: string, options: { col?: number; row?: number } = {}) => {
      if (!projectName) return;

      const sourceParsedSheet = Object.entries(parsedSheets).find(
        ([sheetName, sheet]) =>
          !!sheet.tables.find((table) => table.tableName === tableName)
      );
      const sourceProjectSheetContent = projectSheets?.find(
        (sheet) => sheet.sheetName === sourceParsedSheet?.[0]
      )?.content;
      const sourceTable = sourceParsedSheet?.[1]?.tables.find(
        (table) => table.tableName === tableName
      );
      if (!sourceTable || !sourceProjectSheetContent || !sheetName) return;

      const tableDSLPlacement = sourceTable.dslPlacement;
      const tableNameDSLPlacement = sourceTable.dslTableNamePlacement;
      const layoutDecorator = sourceTable.decorators.find(
        (dec) => dec.decoratorName === layoutDecoratorName
      );
      const layoutDecoratorDSLPlacement = layoutDecorator?.dslPlacement;
      if (!tableDSLPlacement || !layoutDecorator?.dslPlacement) return;

      const tableBeforePlacementDSL = sourceProjectSheetContent.slice(
        tableDSLPlacement?.startOffset,
        layoutDecoratorDSLPlacement?.start
      );
      const tableBeforeNameDSL = sourceProjectSheetContent.slice(
        layoutDecoratorDSLPlacement?.end,
        tableNameDSLPlacement?.start
      );
      const tableAfterNameDSL = sourceProjectSheetContent.slice(
        tableNameDSLPlacement?.end,
        tableDSLPlacement?.stopOffset + 1
      );
      const uniqueNewTableName = escapeTableName(
        createUniqueName(
          unescapeTableName(tableName) + ' clone',
          collectTableNames(parsedSheets)
        )
      );

      let newTableCol = options.col;
      let newTableRow = options.row;
      if (!newTableCol || !newTableRow) {
        newTableCol = (layoutDecorator.params[0][1] ?? 1) + 1;
        newTableRow = (layoutDecorator.params[0][0] ?? 1) + 1;
      }

      const newTableDSL =
        newLine +
        newLine +
        tableBeforePlacementDSL +
        updateLayoutDecorator(layoutDecorator, {
          col: newTableCol!,
          row: newTableRow!,
        }) +
        newLine +
        tableBeforeNameDSL +
        uniqueNewTableName +
        tableAfterNameDSL +
        newLine;

      const updatedSheetContent =
        stripNewLinesAtEnd(sheetContent ?? '') + newTableDSL;

      const historyTitle = `Cloned table "${tableName}" with new name "${uniqueNewTableName}"`;
      updateDSL({
        updatedSheetContent,
        historyTitle,
        sheetNameToChange: sheetName,
        tableName: uniqueNewTableName,
      });
    },
    [
      parsedSheets,
      projectName,
      projectSheets,
      sheetContent,
      sheetName,
      updateDSL,
    ]
  );

  return {
    editExpressionWithOverrideRemove,
    onCloneTable,
    moveTableToSheet,
  };
}

const removeOverrideDSL = (
  table: ParsedTable,
  fieldName: string,
  overrideIndex: number,
  value: OverrideValue,
  inputSheetContent: string
) => {
  if (!table?.dslOverridePlacement || !table?.overrides) return;

  const { overrides, dslOverridePlacement, dslPlacement } = table;
  const { startOffset, stopOffset } = dslOverridePlacement;
  overrides.updateFieldValueByIndex(fieldName, overrideIndex, null);
  const updatedOverride = overrides.convertToDsl();
  const overrideDsl = updatedOverride
    ? `${overrideKeyword}${newLine}${updatedOverride}${newLine}${newLine}`
    : '';

  if (!overrideDsl && table.isManual() && dslPlacement) {
    const { startOffset, stopOffset } = dslPlacement;

    const updatedSheetContent =
      inputSheetContent.substring(0, startOffset) +
      inputSheetContent.substring(stopOffset + 1).replace(newLine, '');

    const historyTitle = `Delete table "${table.tableName}"`;

    return { updatedSheetContent, historyTitle, tableRemoved: true };
  }

  const updatedSheetContent =
    inputSheetContent.substring(0, startOffset) +
    overrideDsl +
    inputSheetContent.substring(stopOffset + 1);

  const historyTitle = `Remove override ${value} from table "${table.tableName}"`;

  return {
    updatedSheetContent,
    historyTitle,
    tableRemoved: false,
  };
};
