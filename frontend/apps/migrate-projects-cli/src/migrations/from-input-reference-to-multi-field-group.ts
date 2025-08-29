import yaml from 'yaml';

import {
  CurrentFieldExpression,
  Decorator,
  escapeFieldName,
  Field,
  FieldGroup,
  FieldReferenceExpression,
  findFunctionExpressions,
  ParsedDecorator,
  ParsedField,
  ParsedTable,
  Sheet,
  SheetReader,
  unescapeTableName,
} from '@frontend/parser';

const inputFunctionName = 'INPUT';

/**
 * Converts comment syntax to note syntax
 */
function commentToNote(comment: string): string {
  return comment
    .replaceAll('\r', '')
    .split('\n')
    .map((line) => line.replace(/^##/, ''))
    .join('\n');
}

/**
 * Finds the field that contains the INPUT function
 */
function findInputSourceField(parsedTable: ParsedTable) {
  return parsedTable.fields.find((field) => {
    const fns = findFunctionExpressions(field.expression);
    const isFieldReference =
      field.expression instanceof FieldReferenceExpression;

    return !isFieldReference && fns.some((f) => f.name === inputFunctionName);
  });
}

/**
 * Finds fields that reference the source field and collects their accessors and names
 */
function findReferencingFields(
  parsedTable: ParsedTable,
  sourceFieldName: string
) {
  const fieldAccessors = [];
  const fieldNames = [];

  for (const field of parsedTable.fields) {
    if (field.key.fieldName === sourceFieldName) continue;

    const { expression, key } = field;
    const isReferencingSourceField =
      expression instanceof FieldReferenceExpression &&
      expression.expression instanceof CurrentFieldExpression &&
      expression.expression.fieldName === sourceFieldName;

    if (!isReferencingSourceField) continue;

    fieldAccessors.push(expression.fieldName);
    fieldNames.push(key.fieldName);
  }

  return { fieldAccessors, fieldNames };
}

/**
 * Creates a field group from the source formula and field accessors
 */
function createFieldGroup(
  sourceFormula: string,
  fieldAccessors: string[],
  fieldNames: string[],
  parsedTable: ParsedTable
) {
  const accessorsList =
    fieldAccessors.length > 1
      ? `[${fieldAccessors.join(', ')}]`
      : fieldAccessors.length === 1
      ? fieldAccessors[0]
      : '';
  const multiFieldFormula = `${sourceFormula}${accessorsList}`;
  const fieldGroup = new FieldGroup(multiFieldFormula);

  // Add the fields to the field group
  for (let i = 0; i < fieldNames.length; i++) {
    const fieldName = fieldNames[i];
    const field = new Field(escapeFieldName(fieldName));

    // set dim only for the first field in the field group
    if (i === 0) {
      field.dim = true;
    }

    const parsedField = parsedTable.fields.find(
      ({ key }) => key.fieldName === fieldName
    );

    if (parsedField) {
      copyFieldAttributes(field, parsedField);
    }

    fieldGroup.addField(field);
  }

  return fieldGroup;
}

/**
 * Copies attributes from a parsed field to a new field
 */
function copyFieldAttributes(targetField: Field, sourceField: ParsedField) {
  // copy key keyword
  if (sourceField.isKey) {
    targetField.key = true;
  }

  // copy all decorators
  if (sourceField.decorators.length > 0) {
    copyDecorators(targetField, sourceField.decorators);
  }

  // copy notes
  if (sourceField.docs.length > 0) {
    const note = sourceField.docs
      .map(({ text }) => text)
      .join('')
      .trimEnd();

    targetField.docString = commentToNote(note);
  }
}

/**
 * Copies decorators from a source field to a target field
 */
function copyDecorators(targetField: Field, decorators: ParsedDecorator[]) {
  for (const decorator of decorators) {
    const { decoratorName, params } = decorator;

    const args = formatDecoratorArgs(params);
    targetField.addDecorator(new Decorator(decoratorName, args));
  }
}

/**
 * Formats decorator arguments
 */
function formatDecoratorArgs(params: any[]) {
  if (!params || params.length === 0) return '()';

  if (Array.isArray(params[0])) {
    const innerParams = params[0];

    const formattedParams = innerParams.map((arg) => {
      // Handle numbers
      if (typeof arg === 'number') {
        return arg;
      }

      // Handle strings
      const trimmed = String(arg).trim();

      // Empty string
      if (trimmed === '') {
        return '';
      }

      // Numeric string
      if (!isNaN(Number(trimmed)) && trimmed !== '') {
        return Number(trimmed);
      }

      // String value - add quotes
      return `"${arg}"`;
    });

    return `(${formattedParams.join(',')})`;
  }

  const formattedParams = params.map((arg) => {
    const trimmed = String(arg).trim();

    return trimmed === ''
      ? ''
      : !isNaN(Number(arg)) && trimmed
      ? arg
      : `"${arg}"`;
  });

  return `(${formattedParams.join(', ')})`;
}

/**
 * Processes a table to convert input references to multi-field group
 */
function processTable(parsedTable: ParsedTable, editableSheet: Sheet) {
  const inputSourceField = findInputSourceField(parsedTable);
  if (!inputSourceField) return false;

  const { fieldName: sourceFieldName } = inputSourceField.key;
  const sourceFormula = inputSourceField.expressionMetadata.text;

  const { fieldAccessors, fieldNames } = findReferencingFields(
    parsedTable,
    sourceFieldName
  );
  if (fieldAccessors.length === 0) return false;

  const table = editableSheet.getTable(
    unescapeTableName(parsedTable.tableName)
  );

  // Create a multi-field expression with the accessors
  const fieldGroup = createFieldGroup(
    sourceFormula,
    fieldAccessors,
    fieldNames,
    parsedTable
  );

  // Remove the original source field and reference fields
  table.removeField(sourceFieldName);
  fieldNames.forEach((fieldName) => {
    table.removeField(fieldName);
  });

  try {
    const index = table.fieldGroups.toGroupIndex(
      inputSourceField.fieldGroupIndex
    );
    table.fieldGroups.insert(index, fieldGroup);
  } catch {
    table.fieldGroups.append(fieldGroup);
  }

  return true;
}

export function fromInputReferenceToMultiFieldGroup(content: string) {
  const data: Record<string, string> = yaml.parse(content);

  for (const sheetName in data) {
    const sheetContent = data[sheetName];

    if (!sheetContent.includes(inputFunctionName)) continue;

    try {
      const parsedSheet = SheetReader.parseSheet(sheetContent);
      const editableSheet = parsedSheet.editableSheet;

      let sheetModified = false;
      for (const parsedTable of parsedSheet.tables) {
        const tableModified = processTable(parsedTable, editableSheet);
        sheetModified = sheetModified || tableModified;
      }

      if (sheetModified) {
        data[sheetName] = editableSheet.toDSL().trim() + '\n';
      }
    } catch (error) {
      console.error(`Error parsing sheet "${sheetName}":`, error);
    }
  }

  return yaml.stringify(data, {
    defaultStringType: 'BLOCK_LITERAL',
    defaultKeyType: 'PLAIN', // Use plain style for keys
    lineWidth: 0, // Prevent line wrapping
  });
}
