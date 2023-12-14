import { parse } from 'csv-parse/browser/esm/sync';

import {
  defaultRowKey,
  keyKeyword,
  newLine,
  OverrideRows,
  OverrideValue,
} from './parser';

export class ParsedOverride {
  public overrideRows: OverrideRows = null;
  public keys: Set<string>;

  constructor(textCSV: string) {
    this.keys = new Set();
    this.parseOverrides(textCSV);
  }

  private parseOverrides(textCSV: string) {
    try {
      this.overrideRows = parse(textCSV, {
        columns: (header) => {
          return header.map((column: any) => this.getFieldNameFromCsv(column));
        },
        skip_empty_lines: true,
        trim: true,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error while parsing overrides');
    }
  }

  public hasKey(fieldName: string) {
    return this.keys.has(fieldName);
  }

  public renameField(oldFieldName: string, newFieldName: string) {
    if (!this.overrideRows) return;

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

  public getValueByKey(
    key: string,
    keyValue: number,
    fieldName: string
  ): { overrideValue: OverrideValue; overrideIndex: number } | null {
    if (!this.overrideRows || !this.hasKey(key)) return null;

    const rowIndex = this.overrideRows.findIndex(
      (row) => row[key] === keyValue.toString()
    );

    if (rowIndex === -1) return null;

    const overrideValue = this.getValueAtIndex(fieldName, rowIndex);

    if (overrideValue === null) return null;

    return { overrideValue, overrideIndex: rowIndex };
  }

  public findByKey(key: string, keyValue: number): number | null {
    if (!this.overrideRows || !this.hasKey(key)) return null;

    const rowIndex = this.overrideRows.findIndex(
      (row) => row[key] === keyValue.toString()
    );

    return rowIndex === -1 ? null : rowIndex;
  }

  public getValueByKeys(keyData: Record<string, string>, fieldName: string) {
    if (!this.overrideRows) return null;

    const rowIndex = this.overrideRows.findIndex((row) => {
      return Object.keys(keyData).every((key) => {
        return row[key] === keyData[key] || !this.hasKey(key);
      });
    });

    if (rowIndex === -1) return null;

    const overrideValue = this.getValueAtIndex(fieldName, rowIndex);

    if (overrideValue === null) return null;

    return { overrideValue, overrideIndex: rowIndex };
  }

  public findByKeys(keyData: Record<string, string>): number | null {
    if (!this.overrideRows) return null;

    const rowIndex = this.overrideRows.findIndex((row) => {
      return Object.keys(keyData).every((key) => {
        return row[key] === keyData[key] || !this.hasKey(key);
      });
    });

    return rowIndex === -1 ? null : rowIndex;
  }

  public updateFieldValueByIndex(
    fieldName: string,
    index: number,
    value: OverrideValue
  ) {
    if (!this.overrideRows) return;

    if (
      this.overrideRows.length >= index &&
      this.overrideRows[index] &&
      Object.prototype.hasOwnProperty.call(this.overrideRows[index], fieldName)
    ) {
      this.overrideRows[index][fieldName] = value;
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

    if (findOverrideIndex !== null) {
      this.setFieldValueByIndex(fieldName, findOverrideIndex, value);
    } else {
      this.overrideRows.push({
        [key]: keyValue,
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

    if (findOverrideIndex !== null) {
      this.setFieldValueByIndex(fieldName, findOverrideIndex, value);
    } else {
      const overrideRow = { [fieldName]: value };

      for (const [key, value] of Object.entries(keys)) {
        overrideRow[key] = value;
        this.keys.add(key);
      }

      this.overrideRows.push(overrideRow);
    }
  }

  public convertToDsl() {
    if (!this.overrideRows) return null;

    this.cleanUpFields();

    const headers: Set<string> = new Set();

    this.overrideRows.forEach((obj) => {
      Object.keys(obj).forEach((key) => {
        const hasSymbolsOrSpaces = /\W/.test(key);
        if (this.keys.has(key)) {
          if (key === defaultRowKey) {
            headers.add(defaultRowKey);
          } else {
            const formattedField = hasSymbolsOrSpaces
              ? `"${keyKeyword} [${key}]"`
              : `${keyKeyword} [${key}]`;
            headers.add(formattedField);
          }
        } else {
          const formattedField = hasSymbolsOrSpaces ? `"[${key}]"` : `[${key}]`;
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
        const convertedCsvValue = this.convertValueToCsv(obj[fieldName] || '');
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

  private isInsideQuotes(value: OverrideValue) {
    if (!value) return false;

    const firstChar = value.toString().charAt(0);
    const lastChar = value.toString().charAt(value.toString().length - 1);

    return firstChar === '"' && lastChar === '"';
  }

  private getFieldNameFromCsv(field: string) {
    const fieldMatch = field.match(/\["?([^"]+)"?]/);
    const isRowKeyword = field.trim() === defaultRowKey;

    if (!isRowKeyword && (!fieldMatch || fieldMatch.length < 2)) return field;

    const isKeyField = field.trimStart().startsWith(keyKeyword);

    isKeyField && fieldMatch && this.keys.add(fieldMatch[1]);
    isRowKeyword && this.keys.add(defaultRowKey);

    return fieldMatch && fieldMatch[1] ? fieldMatch[1] : defaultRowKey;
  }

  private convertValueToCsv(value: OverrideValue) {
    if (value === null) return '';

    if (!Number.isNaN(Number(value))) return value;

    if (this.isInsideQuotes(value)) return value;

    return `"${value}"`;
  }
}
