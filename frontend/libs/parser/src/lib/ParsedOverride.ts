import { Expose } from 'class-transformer';

import { Override, Overrides } from './EditDslApi';
import { Override_definitionContext } from './grammar/SheetParser';
import { ParsedText } from './ParsedText';
import {
  defaultRowKey,
  keyKeyword,
  newLine,
  OverrideRow,
  OverrideRows,
  OverrideValue,
} from './parser';
import { escapeValue } from './services';
import { Span } from './Span';

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
  @Expose()
  public span: Span | null = null;

  @Expose()
  public headers: ParsedText[] = [];

  @Expose()
  public values: ParsedText[][] = [];

  public overrideRows: OverrideRows = null;
  public keys: Set<string>;
  protected isManualTable: boolean;

  constructor(
    ctx?: Override_definitionContext | undefined,
    params?: ParsedOverrideParams
  ) {
    this.keys = new Set();
    this.overrideRows = this.parseOverrides(params);
    this.isManualTable = !!params?.isManual;
    this.from(ctx);
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

  public getAllRowValuesAtIndex(index: number): OverrideRow | null {
    if (!this.overrideRows) return null;

    if (this.overrideRows.length >= index && this.overrideRows[index]) {
      return this.overrideRows[index];
    }

    return null;
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

  public getColumnValues(fieldName: string): OverrideValue[] {
    if (!this.overrideRows) return [];

    return this.overrideRows.map((row) => row[fieldName]);
  }

  public hasColumnOverrides(fieldName: string): boolean {
    const columnValues = this.getColumnValues(fieldName);

    return columnValues.some((v) => v !== null && v !== undefined && v !== '');
  }

  public findByKey(key: string, keyValue: number): number {
    if (!this.overrideRows || !this.hasKey(key)) return -1;

    const escapedKeyValue = escapeValue(keyValue, false, true);

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
      escapedKeyData[key] = escapeValue(escapedKeyData[key], false, true);
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
          key !== defaultRowKey ? escapeValue(keyValue, false, true) : keyValue,
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
          key !== defaultRowKey ? escapeValue(value, false, true) : value;
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

  public applyOverrides(): Overrides | null {
    if (!this.overrideRows) return null;
    this.cleanUpFields();

    const headers: Set<string> = new Set();

    this.overrideRows.forEach((row) => {
      Object.keys(row).forEach(headers.add, headers);
    });

    const header = Array.from(headers);
    let overrides: Overrides | null = null;

    if (this.overrideRows.length > 0) {
      overrides = new Overrides();
    }

    this.overrideRows.forEach((obj) => {
      const row: Record<string, string> = {};
      let rowNumber: string | null = null;

      header.forEach((key) => {
        const fieldName = this.getFieldNameFromCsv(key);
        const value = obj[fieldName] || '';

        if (fieldName === defaultRowKey) {
          rowNumber = value.toString();
        } else {
          row[fieldName] = value.toString();
        }
      });

      const override = new Override(row, rowNumber);
      overrides!.append(override);
    });

    return overrides;
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

  private from(ctx: Override_definitionContext | undefined) {
    if (!ctx) return;

    this.span = Span.fromParserRuleContext(ctx) || null;

    let numberOfRows = 0;
    const allRows = ctx.override_row_list();
    for (let i = allRows.length - 1; i >= 0; i--) {
      const rowCtx = allRows[i];
      if (rowCtx?.children?.length !== 0) {
        numberOfRows = i + 1;
        break;
      }
    }

    const headerList = ctx.override_fields().override_field_list();
    const headers: ParsedText[] = [];
    const fieldNames = new Set<string>();

    for (const headerCtx of headerList) {
      let fieldName: ParsedText | null = null;

      if (headerCtx.ROW_KEYWORD()) {
        const symbol = headerCtx.ROW_KEYWORD().symbol;
        fieldName = new ParsedText(Span.fromToken(symbol), 'row');
      } else {
        fieldName = ParsedText.fromFieldName(headerCtx.field_name());
        if (!fieldName) return;
      }

      if (fieldNames.has(fieldName.text)) return;

      fieldNames.add(fieldName.text);

      headers.push(fieldName);
    }

    const values: ParsedText[][] = [];
    for (let i = 0; i < numberOfRows; i++) {
      const rowCtx = allRows[i];
      const rowValues = rowCtx.override_value_list();

      if (rowValues.length !== headers.length) return;

      const parsedRow: ParsedText[] = [];
      for (let j = 0; j < headers.length; j++) {
        const valueCtx = rowValues[j];
        if (valueCtx.expression()) {
          const exprSpan = Span.fromParserRuleContext(valueCtx.expression());
          const exprText = valueCtx.expression().getText();
          parsedRow.push(new ParsedText(exprSpan, exprText));
        } else {
          const { start, stop } = valueCtx.start;
          const emptySpan = new Span(start, stop);
          parsedRow.push(new ParsedText(emptySpan, ''));
        }
      }
      values.push(parsedRow);
    }

    this.headers = headers;
    this.values = values;
  }
}
