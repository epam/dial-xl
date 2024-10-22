import { GridViewport, unescapeFieldName } from '@frontend/common';
import { dynamicFieldName, ParsedTable } from '@frontend/parser';

const extraDirectionOffset = 10;

export function getTableFieldsForViewport(
  viewport: GridViewport,
  table: ParsedTable,
  dynamicFields: string[],
  isDynamicFieldsRequested: boolean
) {
  const [tableStartRow, tableStartCol] = table.getPlacement();
  const isTableHorizontal = table.getIsTableDirectionHorizontal();
  const directionStart = isTableHorizontal ? tableStartRow : tableStartCol;
  const viewportDirectionEnd = isTableHorizontal
    ? viewport.endRow
    : viewport.endCol;
  const viewportDirectionStart = isTableHorizontal
    ? viewport.startRow
    : viewport.startCol;
  const dynamicFieldIndex = table.fields.findIndex(
    (f) => f.key.fieldName === dynamicFieldName
  );

  const fields = table.getFieldsWithoutDynamic().map((field, index) => {
    const fieldRealIndex = table.fields.findIndex(
      (f) => f.key.fieldName === field.key.fieldName
    );

    let directionValue = index + directionStart;

    if (dynamicFieldIndex !== -1 && fieldRealIndex > dynamicFieldIndex) {
      directionValue += dynamicFields.length;
    }

    return {
      fieldName: unescapeFieldName(field.key.fieldName),
      directionValue,
    };
  });

  if (fields.length === 0 && !table.hasDynamicFields()) return [];

  let fullFields = [];
  const dynamicFieldsMap = dynamicFields.map((fieldName, index) => ({
    directionValue: index + directionStart,
    fieldName: unescapeFieldName(fieldName),
  }));

  if (fields.length > 0) {
    const lastField = fields[fields.length - 1];
    const lastNonDynamicColumn = lastField.directionValue;

    if (!lastNonDynamicColumn) return [];

    fullFields = [...fields, ...dynamicFieldsMap];
  } else {
    fullFields = dynamicFieldsMap;
  }

  const fieldsToRequest = fullFields
    .filter(({ directionValue }) => {
      return (
        directionValue < viewportDirectionEnd + extraDirectionOffset &&
        directionValue >
          Math.max(0, viewportDirectionStart - extraDirectionOffset)
      );
    })
    .map(({ fieldName }) => fieldName);

  if (table.hasDynamicFields() && !isDynamicFieldsRequested) {
    fieldsToRequest.push('*');
  }

  // All key fields should be requested
  // Cause: their values are using in the formulas, e.g. when expand table
  table.fields
    .filter((field) => field.isKey)
    .map((field) => unescapeFieldName(field.key.fieldName))
    .forEach((keyFieldName) => {
      const findFieldIndex = fieldsToRequest.findIndex(
        (f) => f === keyFieldName
      );

      if (findFieldIndex === -1) {
        fieldsToRequest.push(keyFieldName);
      }
    });

  return fieldsToRequest;
}
