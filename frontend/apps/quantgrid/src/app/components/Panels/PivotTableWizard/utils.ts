import {
  ConstStringExpression,
  Expression,
  FieldReferenceExpression,
  FieldsReferenceExpression,
  TableReferenceExpression,
} from '@frontend/parser';

export const minPlacement = 1;

export type FieldItem = {
  id: string;
  name: string;
};

export type SetFieldsCallback = (
  fields: FieldItem[] | ((prev: FieldItem[]) => FieldItem[])
) => void;

export type OnMoveItem = (
  itemId: string,
  sourceContainer: ContainerId,
  targetContainer: ContainerId
) => void;

export type FieldContainerId =
  | 'available-fields'
  | 'row-fields'
  | 'column-fields'
  | 'value-fields';

export type ContainerId = FieldContainerId;

export const fieldContainers: FieldContainerId[] = [
  'available-fields',
  'row-fields',
  'column-fields',
  'value-fields',
];

export const isFieldContainer = (
  container: ContainerId
): container is (typeof fieldContainers)[number] =>
  fieldContainers.includes(container as (typeof fieldContainers)[number]);

export const formatFieldReference = (
  fields: FieldItem[],
  tableName: string
) => {
  if (!tableName) return '';

  if (fields.length === 0) {
    return '';
  } else if (fields.length === 1) {
    return `${tableName}[${fields[0].name}]`;
  } else {
    // For multiple fields, use the [[field1],[field2]] syntax
    const fieldRefs = fields.map((field) => `[${field.name}]`).join(',');

    return `${tableName}[${fieldRefs}]`;
  }
};

export const parsePivotArguments = (
  args: Expression[],
  aggregationFunctions: string[]
) => {
  let rowsArg: Expression | undefined;
  let columnsArg: Expression | undefined;
  let valuesArg: Expression | undefined;
  let aggregationsArg: Expression | undefined;

  if (args.length === 4) {
    [rowsArg, columnsArg, valuesArg, aggregationsArg] = args;
  } else {
    for (const a of args) {
      if (a instanceof ConstStringExpression) {
        if (!aggregationsArg) aggregationsArg = a;
        continue;
      }
      const isFieldRef =
        a instanceof FieldReferenceExpression ||
        a instanceof FieldsReferenceExpression;
      if (isFieldRef) {
        if (!rowsArg) rowsArg = a;
        else if (!columnsArg) columnsArg = a;
        else if (!valuesArg) valuesArg = a;
      }
    }
  }

  const result: {
    rows: FieldItem[];
    columns: FieldItem[];
    values: FieldItem[];
    aggregations: FieldItem[];
    tableName?: string;
  } = {
    rows: [],
    columns: [],
    values: [],
    aggregations: [],
  };

  // Extract rows
  if (rowsArg && rowsArg instanceof FieldReferenceExpression) {
    const tableRefExpression = rowsArg?.expression as TableReferenceExpression;
    if (tableRefExpression?.tableName) {
      result.tableName = tableRefExpression.tableName;
    }
    result.rows = [extractFieldFromReference(rowsArg)];
  } else if (rowsArg && rowsArg instanceof FieldsReferenceExpression) {
    result.rows = extractFieldsFromReference(rowsArg);
  }

  // Extract columns
  if (columnsArg && columnsArg instanceof FieldReferenceExpression) {
    const tableRefExpression =
      columnsArg?.expression as TableReferenceExpression;
    if (tableRefExpression?.tableName) {
      result.tableName = tableRefExpression.tableName;
    }
    result.columns = [extractFieldFromReference(columnsArg)];
  } else if (columnsArg && columnsArg instanceof FieldsReferenceExpression) {
    result.columns = extractFieldsFromReference(columnsArg);
  }

  // Extract values
  if (valuesArg && valuesArg instanceof FieldReferenceExpression) {
    const tableRefExpression =
      valuesArg?.expression as TableReferenceExpression;
    if (tableRefExpression?.tableName) {
      result.tableName = tableRefExpression.tableName;
    }
    result.values = [extractFieldFromReference(valuesArg)];
  } else if (valuesArg && valuesArg instanceof FieldsReferenceExpression) {
    result.values = extractFieldsFromReference(valuesArg);
  }

  // Extract aggregations
  if (aggregationsArg && aggregationsArg instanceof ConstStringExpression) {
    const aggregationText = aggregationsArg.text;
    const foundAggregation = aggregationFunctions.find(
      (a) => a === aggregationText
    );

    if (foundAggregation) {
      result.aggregations = [
        {
          id: foundAggregation,
          name: foundAggregation,
        },
      ];
    }
  }

  return result;
};

const extractFieldFromReference = (
  fieldRef: FieldReferenceExpression
): FieldItem => {
  const fieldName = fieldRef.fieldName.substring(
    1,
    fieldRef.fieldName.length - 1
  );

  return {
    id: fieldName,
    name: fieldName,
  };
};

const extractFieldsFromReference = (
  fieldsRef: FieldsReferenceExpression
): FieldItem[] => {
  const fieldNames = fieldsRef.fields.map((f) => f.substring(1, f.length - 1));

  return fieldNames.map((name) => ({
    id: name,
    name: name,
  }));
};

export const toSelectOption = (
  value: string,
  label?: string
): { value: string; label: string } => ({
  value,
  label: label || value,
});

export const defaultAggregationOption = toSelectOption('SUM');
export const defaultAggregationArgsCount = 1;
