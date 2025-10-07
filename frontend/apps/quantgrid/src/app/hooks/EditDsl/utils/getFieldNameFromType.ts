import { ColumnDataType, defaultFieldName } from '@frontend/common';

export function getFieldNameFromType(type: ColumnDataType) {
  switch (type) {
    case ColumnDataType.DOUBLE:
      return 'number';
    case ColumnDataType.STRING:
      return 'text';
    default:
      return defaultFieldName;
  }
}
