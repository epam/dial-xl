import { useCallback, useContext } from 'react';

import { HorizontalDirection } from '@frontend/canvas-spreadsheet';
import {
  ColumnDataType,
  defaultFieldName,
  isTableType,
} from '@frontend/common';
import {
  Decorator,
  descriptionDecoratorName,
  dynamicFieldName,
  escapeFieldName,
  escapeValue,
  Field,
  fieldColSizeDecoratorName,
  FieldGroup,
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
  createUniqueName,
  generateFieldExpressionFromText,
  sanitizeExpression,
} from '../../services';
import { getExpandedTextSize, getProjectSheetsRecord } from '../../utils';
import { useGridApi } from '../useGridApi';
import { useSafeCallback } from '../useSafeCallback';
import { useSpreadsheetSelection } from '../useSpreadsheetSelection';
import { useDSLUtils } from './useDSLUtils';
import {
  addOverridesToTable,
  editFieldDecorator,
  getParsedFormulaInfo,
} from './utils';

export function useFieldEditDsl() {
  const { parsedSheets, projectSheets, functions, sheetName, projectName } =
    useContext(ProjectContext);
  const { openCellEditor } = useContext(AppSpreadsheetInteractionContext);
  const { updateDSL, findEditContext, findLastTableField, getFormulaSchema } =
    useDSLUtils();
  const { updateSelectionAfterDataChanged } = useSpreadsheetSelection();
  const gridApi = useGridApi();

  const changeFieldDimension = useCallback(
    (tableName: string, fieldName: string, isRemove = false) => {
      const context = findEditContext(tableName, fieldName);
      if (!context) return;

      const { sheetName, sheet, table } = context;

      for (const fieldGroup of table.fieldGroups) {
        if (!fieldGroup.hasField(fieldName)) continue;

        if (fieldGroup.fieldCount > 1) {
          const firstGroupField = fieldGroup.getFieldByIndex(0);

          if (firstGroupField.dim === !isRemove) return;

          firstGroupField.dim = !isRemove;
        } else {
          const targetField = fieldGroup.getField(fieldName);

          if (targetField.dim === !isRemove) return;

          targetField.dim = !isRemove;
        }
      }

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
      formatName?: string,
      formatParams: (string | number | boolean)[] = []
    ) => {
      const context = findEditContext(tableName, fieldName);
      if (!context?.field) return;

      const { sheet, field } = context;
      let success = false;

      let decoratorArgs: string;
      if (!formatName) {
        decoratorArgs = getFormatDecoratorArgs([]);
      } else {
        decoratorArgs = getFormatDecoratorArgs([formatName, ...formatParams]);
      }

      success = editFieldDecorator(
        field,
        formatDecoratorName,
        decoratorArgs,
        !formatName
      );

      if (!success) return;

      const historyTitle = formatName
        ? `Set format "${formatName}" to column "${fieldName}" of table "${tableName}"`
        : `Remove explicit format for column "${fieldName}" of table "${tableName}"`;

      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });
    },
    [findEditContext, updateDSL]
  );

  const editExpressionWithOverrideRemove = useCallback(
    (
      tableName: string,
      fieldName: string,
      expression: string,
      overrideIndex: number
    ) => {
      const context = findEditContext(tableName, fieldName);

      if (!context || !projectSheets) return;
      const { sheet, parsedTable, parsedField, table } = context;
      const { overrides: parsedOverrides } = parsedTable;
      const overrides = table.overrides;
      if (!overrides || !parsedOverrides) return;

      let parsedTargetField: ParsedField | undefined = parsedField;
      let field: Field | undefined = context?.field;

      if (parsedField?.isDynamic) {
        parsedTargetField = parsedTable.getDynamicField();
        field = table.getField(dynamicFieldName);
        fieldName = dynamicFieldName;
      }

      if (!parsedTargetField || !field) return;

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

      table.setFieldFormula(fieldName, fixedExpression);

      parsedOverrides.updateFieldValueByIndex(fieldName, overrideIndex, null);
      table.overrides = parsedOverrides.applyOverrides();

      let historyTitle = `Update expression of field [${fieldName}] in table "${tableName}"`;

      const overridesIsEmpty = !table.overrides || table.overrides.length === 0;
      if (overridesIsEmpty && parsedTable.isManual()) {
        sheet.removeTable(tableName);
        historyTitle = `Delete table "${tableName}"`;
      }

      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });

      return true;
    },
    [findEditContext, functions, parsedSheets, projectSheets, updateDSL]
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

      table.addField({ name: newFieldName, formula: null });
      parsedTable.fields.push(
        new ParsedField(
          new FieldKey(tableName, `[${newFieldName}]`, newFieldName),
          false,
          undefined,
          undefined,
          0
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
    async (
      tableName: string,
      fieldText: string,
      insertOptions: {
        direction?: HorizontalDirection;
        insertFromFieldName?: string;
        withSelection?: boolean;
      } = {}
    ) => {
      const context = findEditContext(tableName);
      if (!context || !projectSheets) return;

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

      let fieldGroupAdded = false;
      const { fieldNames, expression } = generateFieldExpressionFromText(
        fieldText,
        parsedTable,
        functions,
        parsedSheets,
        tableName
      );
      const existingFieldNames = parsedTable.fields.map((f) => f.key.fieldName);
      const singleDefaultFieldName =
        fieldNames.length === 0
          ? createUniqueName(defaultFieldName, existingFieldNames)
          : fieldNames[0];
      let historyTitle = '';

      // Try to request dim schema and add a field group if the resulting schema is a table
      if (expression) {
        const { schema, fieldInfo, keys, errorMessage } =
          await getFormulaSchema(
            expression,
            getProjectSheetsRecord(projectSheets)
          );

        if (fieldInfo && !errorMessage && isTableType(fieldInfo.type)) {
          let finalFormula = expression;
          let customSchema = schema;

          const { isInputFunction, isFieldReferenceFormula } =
            getParsedFormulaInfo(expression);

          if (isInputFunction && !isFieldReferenceFormula) {
            const fieldsSelector =
              schema.length > 1
                ? schema
                    .map((fieldName) => `[${escapeFieldName(fieldName)}]`)
                    .join(',')
                : escapeFieldName(schema[0]);
            finalFormula = `${expression}[${fieldsSelector}]`;
          }

          if (fieldNames.length > 0) {
            customSchema = fieldNames;

            // Add missing fields from the schema to the customSchema
            if (fieldNames.length < schema.length) {
              for (let i = customSchema.length; i < schema.length; i++) {
                customSchema.push(schema[i]);
              }
            }
          }

          if (fieldNames.length === 0 && schema.length === 0) {
            customSchema = [singleDefaultFieldName];
          }

          if (
            fieldNames.length === 0 &&
            schema.length > 1 &&
            !isFieldReferenceFormula &&
            !isInputFunction
          ) {
            customSchema = [singleDefaultFieldName];
          }

          const fieldGroup = new FieldGroup(finalFormula);
          customSchema.forEach((fieldName) => {
            const uniqueFieldName = createUniqueName(
              fieldName,
              existingFieldNames
            );
            existingFieldNames.push(uniqueFieldName);
            const field = new Field(uniqueFieldName);

            if (keys.includes(fieldName)) {
              field.key = true;
            }

            fieldGroup.addField(field);
          });
          table.fieldGroups.append(fieldGroup);

          historyTitle = `Add group of ${customSchema.length} field${
            customSchema.length > 1 ? 's' : ''
          } to table "${tableName}"`;
          fieldGroupAdded = true;
        }
      }

      if (!fieldGroupAdded) {
        // Add one single field if no field group was added
        if (fieldNames.length <= 1) {
          const name =
            fieldNames.length === 0 ? singleDefaultFieldName : fieldNames[0];
          table.addField({ name, formula: expression });
          table.moveFieldBeforeOrAfter(
            name,
            targetField?.key.fieldName || null,
            direction === 'left'
          );
          historyTitle = `Add [${name}] to table "${tableName}"`;
        } else if (fieldNames.length > 1) {
          // Add a field group if the user provides multiple field names
          const fieldGroup = new FieldGroup(expression);
          for (const fieldName of fieldNames) {
            fieldGroup.addField(new Field(fieldName));
          }
          table.fieldGroups.append(fieldGroup);
          historyTitle = `Add group of ${fieldNames.length} field${
            fieldNames.length > 1 ? 's' : ''
          } to table "${tableName}"`;
        }
      }

      updateDSL({
        updatedSheetContent: sheet.toDSL(),
        historyTitle,
        tableName,
      });

      if (withSelection) {
        openCellEditor({
          tableName,
          fieldName:
            fieldNames.length === 0 ? singleDefaultFieldName : fieldNames[0],
          value: '=',
        });
      }
    },
    [
      findEditContext,
      findLastTableField,
      functions,
      getFormulaSchema,
      openCellEditor,
      parsedSheets,
      projectSheets,
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

  const editExpression = useCallback(
    async (tableName: string, fieldName: string, expression: string) => {
      const context = findEditContext(tableName, fieldName);
      if (!context || !projectSheets) return;

      const { sheet, parsedTable, parsedField, table } = context;
      let parsedTargetField: ParsedField | undefined = parsedField;
      let field: Field | undefined = context?.field;

      if (parsedField?.isDynamic) {
        parsedTargetField = parsedTable.getDynamicField();
        field = table.getField(dynamicFieldName);
        fieldName = dynamicFieldName;
      }

      if (!parsedTargetField || !field) return;

      const targetGroup = parsedTable.fields[0].fieldGroupIndex;
      const shouldRecreateTable =
        !parsedTable.isManual() &&
        parsedTable.fields.every(
          ({ fieldGroupIndex }) => fieldGroupIndex === targetGroup
        );

      /* Old (current) formula and schema */
      const oldExpression = parsedTargetField.expressionMetadata?.text || '';
      const oldLeftSchema = parsedTable.fields
        .filter(
          (f) =>
            f.fieldGroupIndex === parsedField?.fieldGroupIndex && !f.isDynamic
        )
        .map((f) => f.key.fieldName);
      const { isFieldReferenceFormula: oldHasAccessors } =
        getParsedFormulaInfo(oldExpression);

      /* New formula – auto-fix and schema */
      const sanitizedExpression = sanitizeExpression(expression, oldExpression);
      const fixedNewExpression = autoFixSingleExpression(
        sanitizedExpression,
        functions,
        parsedSheets,
        tableName
      );
      const { isInputFunction, isFieldReferenceFormula, isPivotFunction } =
        getParsedFormulaInfo(fixedNewExpression);
      let newHasAccessors = isFieldReferenceFormula;
      let isPeriodSeries = false;

      /* Request dimensional schema for the new formula */
      let finalSchema: string[] = [];
      let finalFormula = fixedNewExpression;

      const { schema, fieldInfo, errorMessage } = await getFormulaSchema(
        fixedNewExpression,
        getProjectSheetsRecord(projectSheets)
      );

      if (fieldInfo && !errorMessage) {
        finalSchema = schema;
        isPeriodSeries = fieldInfo.type === ColumnDataType.PERIOD_SERIES;

        if (isTableType(fieldInfo.type) || isPeriodSeries) {
          /* Period series has a fixed schema */
          if (isPeriodSeries && !isFieldReferenceFormula) {
            finalSchema = ['date', 'value'];
          }

          /* Auto-append selectors */

          // Do not append selectors if the schema has '*'
          const schemaHasDynamic = finalSchema.some(
            (f) => f === dynamicFieldName
          );
          const hasToAppendSelectors =
            !schemaHasDynamic &&
            !isPivotFunction &&
            ((!isFieldReferenceFormula &&
              (isInputFunction || isPeriodSeries)) ||
              shouldRecreateTable);

          if (hasToAppendSelectors && !newHasAccessors && finalSchema.length) {
            const selectors =
              finalSchema.length > 1
                ? finalSchema.map((c) => `[${escapeFieldName(c)}]`).join(',')
                : escapeFieldName(finalSchema[0]);

            finalFormula = `${fixedNewExpression}[${selectors}]`;
            newHasAccessors = finalSchema.length > 1;
          }
        }
      }

      const existingFieldNames = new Set(
        parsedTable.fields.map((f) => f.key.fieldName)
      );

      // Special handling for pivot function – always update the left part
      if (isPivotFunction) {
        const shouldAddDim = !!fieldInfo?.isNested;
        const targetFieldGroup = table.getFieldGroupByFieldName(
          oldLeftSchema[0]
        );

        if (targetFieldGroup) {
          oldLeftSchema.forEach((c) => {
            table.removeField(c, false);
            existingFieldNames.delete(c);
          });

          finalSchema.forEach((acc, index) => {
            const uniqueFieldName = createUniqueName(acc, [
              ...existingFieldNames,
            ]);
            existingFieldNames.add(uniqueFieldName);
            const newField = new Field(uniqueFieldName);

            if (index === 0 && shouldAddDim) {
              newField.dim = true;
            }

            targetFieldGroup.addField(newField);
          });

          table.setFieldFormula(finalSchema[0], finalFormula);
        }
      } else {
        /* Manipulate columns */
        /* both formulas have accessor lists */
        if (oldHasAccessors && newHasAccessors && finalSchema.length) {
          const oldSchemaLen = oldLeftSchema.length;
          const newSchemaLen = finalSchema.length;

          // Add new columns if the accessor list got longer
          if (newSchemaLen > oldSchemaLen) {
            const lastLeft = oldLeftSchema[oldSchemaLen - 1];
            const targetFieldGroup = table.getFieldGroupByFieldName(lastLeft);

            if (targetFieldGroup) {
              for (let i = oldSchemaLen; i < newSchemaLen; i++) {
                const uniqueFieldName = createUniqueName(finalSchema[i], [
                  ...existingFieldNames,
                ]);
                existingFieldNames.add(uniqueFieldName);
                targetFieldGroup.addField(new Field(uniqueFieldName));
              }
            }
          }

          // Remove surplus columns if the accessor list got shorter
          if (newSchemaLen < oldSchemaLen) {
            for (let i = newSchemaLen; i < oldSchemaLen; i++) {
              table.removeField(oldLeftSchema[i]);
            }
          }

          table.setFieldFormula(oldLeftSchema[0], finalFormula);
        } else if (oldHasAccessors && !newHasAccessors) {
          /* Accessor list removed */
          oldLeftSchema.slice(1).forEach((c) => table.removeField(c));
          table.setFieldFormula(oldLeftSchema[0], finalFormula);
        } else if (!oldHasAccessors && newHasAccessors && finalSchema.length) {
          /* Accessor list added */
          const firstColumn = oldLeftSchema[0];
          const targetFieldGroup = table.getFieldGroupByFieldName(firstColumn);

          if (targetFieldGroup) {
            finalSchema.slice(1).forEach((acc) => {
              const uniqueFieldName = createUniqueName(acc, [
                ...existingFieldNames,
              ]);
              existingFieldNames.add(uniqueFieldName);
              targetFieldGroup.addField(new Field(uniqueFieldName));
            });
          }

          table.setFieldFormula(firstColumn, finalFormula);
        } else {
          /* No accessor lists before or after */
          table.setFieldFormula(fieldName, finalFormula);
        }
      }

      /* Adjust the `dim` flag if necessary */
      const shouldAddDim =
        shouldRecreateTable && (fieldInfo?.isNested || isPeriodSeries);

      if ((parsedTargetField.isDim && shouldRecreateTable) || shouldAddDim) {
        for (const fieldGroup of table.fieldGroups) {
          if (!fieldGroup.hasField(fieldName)) continue;

          if (fieldGroup.fieldCount > 1) {
            const firstGroupField = fieldGroup.getFieldByIndex(0);

            firstGroupField.dim = shouldAddDim;
          } else {
            const targetField = fieldGroup.getField(fieldName);

            targetField.dim = shouldAddDim;
          }
        }
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
      getFormulaSchema,
      parsedSheets,
      projectSheets,
      updateDSL,
    ]
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
    editExpressionWithOverrideRemove: useSafeCallback(
      editExpressionWithOverrideRemove
    ),
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
