import {
  defaultRowKey,
  keyKeyword,
  newLine,
  OverrideRow,
  OverrideRows,
  OverrideValue,
} from './parser';
import { escapeOverrideValue } from './services';

type ParsedOverrideParams = {
  overrideFields: string[];
  overrideValues: string[][];
  keyFields: string[];
  isManual: boolean;
};

export type CachedOverrideRow = {
  overrideRow: OverrideRow | null;
  overrideIndex: number | null;
  overrideSectionIndex?: number | null;
};

export class ParsedOverride {
  public overrideRows: OverrideRows = null;
  public keys: Set<string>;
  protected isManualTable: boolean;

  constructor(params?: ParsedOverrideParams) {
    this.keys = new Set();
    this.overrideRows = this.parseOverrides(params);
    this.isManualTable = !!params?.isManual;
  }

  private parseOverrides(params?: ParsedOverrideParams): OverrideRows {
    if (!params) {
      return [];
    }

    const { keyFields, overrideFields, overrideValues } = params;

    keyFields.forEach((f) => this.keys.add(f));

    const fieldNames = overrideFields.map((field) =>
      this.getFieldNameFromCsv(field)
    );

    return overrideValues.map((valueRow) =>
      valueRow.reduce((acc, curr, index) => {
        acc[fieldNames[index]] = curr;

        return acc;
      }, <OverrideRow>{})
    );
  }

  public hasKey(fieldName: string) {
    return this.keys.has(fieldName);
  }

  public removeField(fieldName: string) {
    if (!this.overrideRows) return;

    this.overrideRows.forEach((row) => {
      delete row[fieldName];
    });

    this.keys.delete(fieldName);
  }

  public renameField(oldFieldName: string, newFieldName: string) {
    if (!this.overrideRows || oldFieldName === newFieldName) return;

    this.overrideRows.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(row, oldFieldName)) {
        row[newFieldName] = row[oldFieldName];
        delete row[oldFieldName];
      }
    });

    if (!this.keys.has(oldFieldName)) return;

    this.keys.delete(oldFieldName);
    this.keys.add(newFieldName);
  }

  public getValueAtIndex(fieldName: string, index: number): OverrideValue {
    if (!this.overrideRows) return null;

    if (
      this.overrideRows.length >= index &&
      this.overrideRows[index] &&
      Object.prototype.hasOwnProperty.call(this.overrideRows[index], fieldName)
    ) {
      return this.overrideRows[index][fieldName];
    }

    return null;
  }

  public getRowAtIndex(fieldName: string, index: number): OverrideRow | null {
    if (!this.overrideRows) return null;

    if (
      this.overrideRows.length >= index &&
      this.overrideRows[index] &&
      Object.prototype.hasOwnProperty.call(this.overrideRows[index], fieldName)
    ) {
      return this.overrideRows[index];
    }

    return null;
  }

  public getRowByKey(key: string, keyValue: number): CachedOverrideRow | null {
    const defaultResult = { overrideRow: null, overrideIndex: null };

    if (!this.overrideRows || !this.hasKey(key)) return defaultResult;

    const rowIndex = this.findByKey(key, keyValue);

    if (rowIndex === -1) return defaultResult;

    return {
      overrideRow: this.overrideRows[rowIndex],
      overrideIndex: rowIndex,
    };
  }

  public getRowByKeys(
    keyData: Record<string, string>
  ): CachedOverrideRow | null {
    const defaultResult = { overrideRow: null, overrideIndex: null };

    if (!this.overrideRows) return defaultResult;

    const rowIndex = this.findByKeys(keyData);

    if (rowIndex === -1) return defaultResult;

    return {
      overrideRow: this.overrideRows[rowIndex],
      overrideIndex: rowIndex,
    };
  }

  public findByKey(key: string, keyValue: number): number {
    if (!this.overrideRows || !this.hasKey(key)) return -1;

    const escapedKeyValue = escapeOverrideValue(keyValue, false, true);

    const rowIndex = this.overrideRows.findIndex((row) =>
      key !== defaultRowKey
        ? row[key]?.toString() === escapedKeyValue
        : row[key] === keyValue.toString()
    );

    return rowIndex === -1 ? -1 : rowIndex;
  }

  public findByKeys(keyData: Record<string, string>): number {
    if (!this.overrideRows) return -1;

    const escapedKeyData = Object.assign({}, keyData);

    Object.keys(escapedKeyData).forEach((key) => {
      escapedKeyData[key] = escapeOverrideValue(
        escapedKeyData[key],
        false,
        true
      );
    });

    const rowIndex = this.overrideRows.findIndex((row) => {
      return Object.keys(keyData).every((key) => {
        const keyStr = row[key]?.toString();

        return (
          (key === defaultRowKey
            ? keyStr === keyData[key]
            : keyStr === escapedKeyData[key]) || !this.hasKey(key)
        );
      });
    });

    return rowIndex === -1 ? -1 : rowIndex;
  }

  public updateFieldValueByIndex(
    fieldName: string,
    index: number,
    value: OverrideValue
  ) {
    let overrideIndex = index;

    if (!this.overrideRows) return;

    if (this.hasKey(defaultRowKey)) {
      overrideIndex = this.findByKey(defaultRowKey, index);
    }

    if (
      this.overrideRows.length >= overrideIndex &&
      this.overrideRows[overrideIndex] &&
      Object.prototype.hasOwnProperty.call(
        this.overrideRows[overrideIndex],
        fieldName
      )
    ) {
      this.overrideRows[overrideIndex][fieldName] = value;
    }
  }

  public setFieldValueByIndex(
    fieldName: string,
    index: number,
    value: OverrideValue
  ) {
    if (!this.overrideRows) {
      this.overrideRows = [];
    }

    if (this.overrideRows.length <= index) {
      this.overrideRows[index] = {};
    }

    this.overrideRows[index][fieldName] = value;
  }

  public setFieldValueByKey(
    key: string,
    keyValue: number,
    fieldName: string,
    value: OverrideValue
  ) {
    if (!this.overrideRows) {
      this.overrideRows = [];
    }

    const findOverrideIndex = this.findByKey(key, keyValue);

    if (findOverrideIndex !== -1) {
      this.setFieldValueByIndex(fieldName, findOverrideIndex, value);
    } else {
      this.overrideRows.push({
        [key]:
          key !== defaultRowKey
            ? escapeOverrideValue(keyValue, false, true)
            : keyValue,
        [fieldName]: value,
      });
      this.keys.add(key);
    }
  }

  public setValueByKeys(
    keys: Record<string, string>,
    fieldName: string,
    value: OverrideValue
  ) {
    if (!this.overrideRows) {
      this.overrideRows = [];
    }

    const findOverrideIndex = this.findByKeys(keys);

    if (findOverrideIndex !== -1) {
      this.setFieldValueByIndex(fieldName, findOverrideIndex, value);
    } else {
      const overrideRow = { [fieldName]: value };

      for (const [key, value] of Object.entries(keys)) {
        overrideRow[key] =
          key !== defaultRowKey
            ? escapeOverrideValue(value, false, true)
            : value;
        this.keys.add(key);
      }

      this.overrideRows.push(overrideRow);
    }
  }

  public removeRow(index: number) {
    if (!this.overrideRows) return;

    this.overrideRows.splice(index, 1);
  }

  // Insert row in place with moving other rows
  public insertRow(index: number, value = '""') {
    if (!this.overrideRows || index < 0 || index > this.overrideRows.length)
      return;

    const defaultValue = value;
    const newRow = Object.keys(this.overrideRows[0]).reduce((acc, key) => {
      acc[key] = defaultValue;

      return acc;
    }, <Record<string, string>>{});

    this.overrideRows.splice(index, 0, newRow);
  }

  public getSize() {
    return this.overrideRows ? this.overrideRows.length : 0;
  }

  public convertToDsl() {
    if (!this.overrideRows) return null;

    this.cleanUpFields();

    const headers: Set<string> = new Set();

    this.overrideRows.forEach((obj) => {
      Object.keys(obj).forEach((key) => {
        if (this.keys.has(key)) {
          if (key === defaultRowKey) {
            headers.add(defaultRowKey);
          } else {
            const formattedField = `${keyKeyword} [${key}]`;
            headers.add(formattedField);
          }
        } else {
          const formattedField = `[${key}]`;
          headers.add(formattedField);
        }
      });
    });

    const header = Array.from(headers);
    const output = [];

    output.push(header.join(','));

    this.overrideRows.forEach((obj) => {
      const row: any[] = [];
      header.forEach((key) => {
        const fieldName = this.getFieldNameFromCsv(key);
        const value = obj[fieldName];
        const convertedCsvValue = value || '';
        row.push(convertedCsvValue);
      });
      output.push(row.join(','));
    });

    return output.join(newLine);
  }

  private cleanUpFields() {
    if (!this.overrideRows) return;

    // Remove fields if all it values are null
    const fieldsToRemove: Set<string> = new Set();
    this.overrideRows.forEach((row) => {
      Object.keys(row)
        .filter((f) => !this.keys.has(f))
        .forEach((field) => {
          if (row[field] === null && this.overrideRows) {
            let allNull = true;
            for (const otherRow of this.overrideRows) {
              if (otherRow[field] !== null) {
                allNull = false;
                break;
              }
            }
            if (allNull) {
              fieldsToRemove.add(field);
            }
          }
        });
    });

    this.overrideRows.forEach((row) => {
      fieldsToRemove.forEach((field) => delete row[field]);
    });

    if (this.isManualTable && this.keys.size > 0) return;

    // Remove rows with all null values (except key fields)
    const rowsToRemove: number[] = [];
    this.overrideRows.forEach((row, index) => {
      let allNull = true;
      Object.keys(row)
        .filter((f) => !this.keys.has(f))
        .forEach((field) => {
          if (row[field] !== null) {
            allNull = false;
          }
        });
      if (allNull) {
        rowsToRemove.push(index);
      }
    });

    rowsToRemove
      .reverse()
      .forEach(
        (index) => this.overrideRows && this.overrideRows.splice(index, 1)
      );
  }

  private getFieldNameFromCsv(field: string) {
    const fieldMatch = field.match(/\[(.+)]/);
    const isRowKeyword = field.trim() === defaultRowKey;

    if (!isRowKeyword && (!fieldMatch || fieldMatch.length < 2)) return field;

    const isKeyField = field.trimStart().startsWith(keyKeyword);

    isKeyField && fieldMatch && this.keys.add(fieldMatch[1]);
    isRowKeyword && this.keys.add(defaultRowKey);

    return fieldMatch && fieldMatch[1] ? fieldMatch[1] : defaultRowKey;
  }
}
