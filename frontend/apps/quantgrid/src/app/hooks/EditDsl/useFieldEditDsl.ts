import { useCallback, useContext } from 'react';

import { HorizontalDirection } from '@frontend/canvas-spreadsheet';
import {
  Decorator,
  descriptionDecoratorName,
  dynamicFieldName,
  escapeValue,
  Field,
  fieldColSizeDecoratorName,
  FieldKey,
  formatDecoratorName,
  getFormatDecoratorArgs,
  indexDecoratorName,
  lineBreak,
  ParsedField,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
} from '../../context';
import {
  autoFixSingleExpression,
  generateFieldExpressionFromText,
  sanitizeExpression,
} from '../../services';
import {
  FormatKeys,
  getExpandedTextSize,
  getProjectSheetsRecord,
} from '../../utils';
import { useDSLUtils } from '../ManualEditDSL';
import { useApiRequests } from '../useApiRequests';
import { useGridApi } from '../useGridApi';
import { useSafeCallback } from '../useSafeCallback';
import { useSpreadsheetSelection } from '../useSpreadsheetSelection';
import { addOverridesToTable, editFieldDecorator } from './utils';

export function useFieldEditDsl() {
  const { parsedSheets, projectSheets, functions, sheetName, projectName } =
    useContext(ProjectContext);
  const { openCellEditor } = useContext(AppSpreadsheetInteractionContext);
  const { updateDSL, findEditContext, findLastTableField } = useDSLUtils();
  const { updateSelectionAfterDataChanged } = useSpreadsheetSelection();
  const { getDimensionalSchema } = useApiRequests();
  const gridApi = useGridApi();

  const changeFieldDimension = useCallback(
    (tableName: string, fieldName: string, isRemove = false) => {
      const context = findEditContext(tableName, fieldName);

      if (!context?.field || context?.parsedField?.isDim === !isRemove) return;

      const { sheetName, sheet, field } = context;

      field.dim = !isRemove;

      const historyTitle = isRemove
        ? `Remove dimension ${tableName}[${fieldName}]`
        : `Add dimension ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const changeFieldKey = useCallback(
    (tableName: string, fieldName: string, isRemove = false) => {
      const context = findEditContext(tableName, fieldName);

      if (!context?.field || context?.parsedField?.isKey === !isRemove) return;

      const { sheetName, sheet, field } = context;

      field.key = !isRemove;

      const historyTitle = isRemove
        ? `Remove key ${tableName}[${fieldName}]`
        : `Add key ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const changeFieldDescription = useCallback(
    (
      tableName: string,
      fieldName: string,
      descriptionFieldName: string,
      isRemove = false
    ) => {
      const context = findEditContext(tableName, fieldName);

      if (!context?.field || !context?.parsedField) return;

      const isDescription = context.parsedField.isDescription();
      const isIndex = context.parsedField.isIndex();

      if (isRemove && !isDescription) return;

      const { sheetName, sheet, field } = context;

      if (!isRemove && !isIndex) {
        const success = editFieldDecorator(
          field,
          indexDecoratorName,
          '()',
          isRemove
        );
        if (!success) return;
      }

      const success = editFieldDecorator(
        field,
        descriptionDecoratorName,
        `(${escapeValue(descriptionFieldName)})`,
        isRemove
      );
      if (!success) return;

      const historyTitle = isRemove
        ? `Unmark as Description ${tableName}[${fieldName}]`
        : `Mark as Description ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const changeFieldIndex = useCallback(
    (tableName: string, fieldName: string, isRemove = false) => {
      const context = findEditContext(tableName, fieldName);

      if (
        !context?.field ||
        !context?.parsedField ||
        context.parsedField.isIndex() === !isRemove
      )
        return;

      const { sheetName, sheet, field } = context;

      const success = editFieldDecorator(
        field,
        indexDecoratorName,
        '()',
        isRemove
      );
      if (!success) return;

      if (context.parsedField.isDescription()) {
        const success = editFieldDecorator(
          field,
          descriptionDecoratorName,
          '',
          isRemove
        );
        if (!success) return;
      }

      const historyTitle = isRemove
        ? `Unmark as Index ${tableName}[${fieldName}]`
        : `Mark as Index ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        sheetNameToChange: sheetName,
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const handleChangeColumnSize = useCallback(
    (tableName: string, fieldName: string, valueAdd: number) => {
      const context = findEditContext(tableName, fieldName);

      if (!context?.field || !context?.parsedField) return;

      const { sheet, field, parsedField } = context;
      const currentColumnSize = parsedField.getSize();
      const updatedColumnSize = currentColumnSize + valueAdd;

      if (updatedColumnSize <= 0 || !valueAdd) return;

      const sizeDecoratorArgs = `(${updatedColumnSize})`;
      const shouldRemoveSizeDecorator = updatedColumnSize === 1;

      const success = editFieldDecorator(
        field,
        fieldColSizeDecoratorName,
        sizeDecoratorArgs,
        shouldRemoveSizeDecorator
      );
      if (!success) return;

      const historyTitle = `${
        valueAdd > 0 ? 'Increase' : 'Decrease'
      } column width ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });

      updateSelectionAfterDataChanged();
    },
    [findEditContext, updateDSL, updateSelectionAfterDataChanged]
  );

  const onIncreaseFieldColumnSize = useCallback(
    (tableName: string, fieldName: string) => {
      handleChangeColumnSize(tableName, fieldName, 1);
    },
    [handleChangeColumnSize]
  );
  const onDecreaseFieldColumnSize = useCallback(
    (tableName: string, fieldName: string) => {
      handleChangeColumnSize(tableName, fieldName, -1);
    },
    [handleChangeColumnSize]
  );

  const setFormat = useCallback(
    (
      tableName: string,
      fieldName: string,
      formatName: string,
      formatParams: (string | number | boolean)[] = []
    ) => {
      const context = findEditContext(tableName, fieldName);
      if (!context?.field) return;

      const { sheet, field } = context;
      let success: boolean;

      if (formatName === FormatKeys.General) {
        success = editFieldDecorator(field, formatDecoratorName, '', true);
      } else {
        const decoratorArgs = getFormatDecoratorArgs([
          formatName,
          ...formatParams,
        ]);
        success = editFieldDecorator(field, formatDecoratorName, decoratorArgs);
      }

      if (!success) return;

      const historyTitle = `Set format "${formatName}" to column "${fieldName}" of table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const editExpression = useCallback(
    async (tableName: string, fieldName: string, expression: string) => {
      const context = findEditContext(tableName, fieldName);

      if (!context?.field || !projectSheets) return;
      const { sheet, parsedTable, parsedField, field } = context;
      let parsedTargetField: ParsedField | undefined = parsedField;

      if (parsedField?.isDynamic) {
        parsedTargetField = parsedTable.getDynamicField();
      }

      if (!parsedTargetField) return;

      const { expressionMetadata } = parsedTargetField;
      const initialExpression = expressionMetadata?.text || '';
      const sanitizedExpression = sanitizeExpression(
        expression,
        initialExpression
      );
      const fixedExpression = autoFixSingleExpression(
        sanitizedExpression,
        functions,
        parsedSheets,
        tableName
      );

      // Special case for simple table (not manual with a single non-dim field):
      // check if a new formula results in a nested field - add 'dim' keyword to this field
      const isSimpleTable =
        !parsedTable.isManual() &&
        parsedTable.fields.length === 1 &&
        !parsedTargetField.isDim;
      let requiresAddDim = false;

      if (isSimpleTable) {
        const schemaResponse = await getDimensionalSchema({
          worksheets: getProjectSheetsRecord(projectSheets),
          formula: fixedExpression,
        });

        if (schemaResponse?.dimensionalSchemaResponse) {
          const { fieldInfo } = schemaResponse.dimensionalSchemaResponse;
          requiresAddDim = !!fieldInfo?.isNested;
        }
      }

      field.formula = fixedExpression;
      if (requiresAddDim) {
        field.dim = true;
      }

      const historyTitle = `Update expression of column [${fieldName}] in table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [
      findEditContext,
      functions,
      getDimensionalSchema,
      parsedSheets,
      projectSheets,
      updateDSL,
    ]
  );

  const removeFieldDecorator = useCallback(
    (
      tableName: string,
      fieldName: string,
      decoratorName: string,
      customHistoryMessage?: string
    ) => {
      const context = findEditContext(tableName, fieldName);
      if (!context?.field) return;

      const { sheet, field } = context;

      const success = editFieldDecorator(field, decoratorName, '', true);
      if (!success) return;

      const historyTitle = customHistoryMessage
        ? customHistoryMessage
        : `Remove decorator for ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const setFieldDecorator = useCallback(
    (
      tableName: string,
      fieldName: string,
      decoratorName: string,
      value: string,
      customHistoryMessage?: string
    ) => {
      const context = findEditContext(tableName, fieldName);
      if (!context?.field) return;

      const { sheet, field } = context;

      let decoratorArgs = `(${value})`;
      try {
        field.getDecorator(decoratorName);
        decoratorArgs += lineBreak;
      } catch (e) {
        // empty block
      }

      const success = editFieldDecorator(field, decoratorName, decoratorArgs);
      if (!success) return;

      const historyTitle = customHistoryMessage
        ? customHistoryMessage
        : `Add decorator for ${tableName}[${fieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const swapFieldDecorators = useCallback(
    (
      tableName: string,
      sourceFieldName: string,
      targetFieldName: string,
      decoratorName: string,
      value: string,
      customHistoryMessage?: string
    ) => {
      const sourceContext = findEditContext(tableName, sourceFieldName);
      const targetContext = findEditContext(tableName, targetFieldName);

      if (!sourceContext?.field || !targetContext?.field) return;

      const { sheet, field: sourceField } = sourceContext;
      const { field: targetField } = targetContext;
      const args = `(${value})`;

      let success = editFieldDecorator(targetField, decoratorName, args);
      if (!success) return;

      success = editFieldDecorator(sourceField, decoratorName, '', true);
      if (!success) return;

      const historyTitle = customHistoryMessage
        ? customHistoryMessage
        : `Add decorator for ${tableName}[${targetFieldName}]`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const addFieldWithOverride = useCallback(
    ({
      tableName,
      newFieldName,
      overrideCol,
      overrideRow,
      overrideValue,
    }: {
      tableName: string;
      newFieldName: string;
      overrideCol: number;
      overrideRow: number;
      overrideValue: string;
    }) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;

      table.addField(new Field(newFieldName, null));
      parsedTable.fields.push(
        new ParsedField(
          new FieldKey(tableName, `[${newFieldName}]`, newFieldName),
          false
        )
      );
      const updatedParsedOverrides = addOverridesToTable({
        cells: [[overrideValue]],
        selectedCol: overrideCol,
        selectedRow: overrideRow,
        parsedTable,
        gridApi,
      });

      if (!updatedParsedOverrides) return;

      table.overrides = updatedParsedOverrides.applyOverrides();

      const historyTitle = `Add new column "${newFieldName}" with override "${overrideValue}" to table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, gridApi, updateDSL]
  );

  const addField = useCallback(
    (
      tableName: string,
      fieldText: string,
      insertOptions: {
        direction?: HorizontalDirection;
        insertFromFieldName?: string;
        withSelection?: boolean;
      } = {}
    ) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const { direction, insertFromFieldName, withSelection } = insertOptions;

      let targetField = findLastTableField(tableName);

      if (insertFromFieldName) {
        targetField = parsedTable.fields.find(
          (f) => f.key.fieldName === insertFromFieldName
        );
      }

      if (targetField?.isDynamic) {
        targetField = parsedTable.fields.find(
          (f) => f.key.fieldName === dynamicFieldName
        );
      }

      const { fieldName, expression } = generateFieldExpressionFromText(
        fieldText,
        parsedTable,
        functions,
        parsedSheets,
        tableName
      );

      table.addField(new Field(fieldName, expression));
      table.moveFieldBeforeOrAfter(
        fieldName,
        targetField?.key.fieldName || null,
        direction === 'left'
      );

      const historyTitle = `Add [${fieldName}] to table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });

      if (withSelection) {
        openCellEditor({
          tableName,
          fieldName,
          value: '=',
        });
      }
    },
    [
      findEditContext,
      findLastTableField,
      functions,
      openCellEditor,
      parsedSheets,
      updateDSL,
    ]
  );

  const autoFitTableFields = useCallback(
    (tableName: string) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const { fields } = parsedTable;

      const col = parsedTable?.getLayoutDecorator()?.params[0][1];
      let acc = 0;
      for (const parsedField of fields) {
        if (parsedField.isDynamic) continue;

        const { fieldName } = parsedField.key;
        const field = table.getField(fieldName);

        if (parsedField.hasSizeDecorator()) {
          field.removeDecorator(fieldColSizeDecoratorName);
        }

        const fieldSize = getExpandedTextSize({
          text: fieldName,
          col: col + acc,
          grid: gridApi,
          projectName,
          sheetName,
        });
        acc += fieldSize ?? 1;

        if (fieldSize && fieldSize > 1) {
          field.addDecorator(
            new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`)
          );
        }
      }

      const historyTitle = `Auto fit all fields in table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });

      updateSelectionAfterDataChanged();
    },
    [
      findEditContext,
      gridApi,
      projectName,
      sheetName,
      updateDSL,
      updateSelectionAfterDataChanged,
    ]
  );

  const removeFieldSizes = useCallback(
    (tableName: string) => {
      const context = findEditContext(tableName);
      if (!context) return;

      const { sheet, table, parsedTable } = context;
      const { fields } = parsedTable;
      const fieldsWithCustomSize = fields.filter((f) => f.hasSizeDecorator());

      if (fieldsWithCustomSize.length === 0) return;

      for (const parsedField of fieldsWithCustomSize) {
        const field = table.getField(parsedField.key.fieldName);
        field.removeDecorator(fieldColSizeDecoratorName);
      }

      const historyTitle = `Remove column sizes for all fields in table "${tableName}"`;
      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });

      updateSelectionAfterDataChanged();
    },
    [findEditContext, updateDSL, updateSelectionAfterDataChanged]
  );

  return {
    addField: useSafeCallback(addField),
    addFieldWithOverride: useSafeCallback(addFieldWithOverride),
    autoFitTableFields: useSafeCallback(autoFitTableFields),
    changeFieldDimension: useSafeCallback(changeFieldDimension),
    changeFieldIndex: useSafeCallback(changeFieldIndex),
    changeFieldKey: useSafeCallback(changeFieldKey),
    changeFieldDescription: useSafeCallback(changeFieldDescription),
    editExpression: useSafeCallback(editExpression),
    onChangeFieldColumnSize: useSafeCallback(handleChangeColumnSize),
    onDecreaseFieldColumnSize: useSafeCallback(onDecreaseFieldColumnSize),
    onIncreaseFieldColumnSize: useSafeCallback(onIncreaseFieldColumnSize),
    removeFieldDecorator: useSafeCallback(removeFieldDecorator),
    removeFieldSizes: useSafeCallback(removeFieldSizes),
    setFieldDecorator: useSafeCallback(setFieldDecorator),
    setFormat: useSafeCallback(setFormat),
    swapFieldDecorators: useSafeCallback(swapFieldDecorators),
  };
}
