import { Form } from 'antd';
import { useCallback, useEffect, useMemo } from 'react';

import { SelectOption } from '@frontend/common';
import {
  ControlType,
  Expression,
  FieldReferenceExpression,
  findFunctionExpressions,
  ParsedTable,
  SheetReader,
  TableReferenceExpression,
} from '@frontend/parser';

import {
  useDeleteEntityDsl,
  useFieldEditDsl,
  useRenameFieldDsl,
} from '../../../../hooks';
import { AddControlButton } from './AddControlButton';
import { ControlRowForm } from './ControlRowForm';
import { ControlRow, ControlWizardSaveProps, TableOption } from './utils';

type Props = {
  parsedTable: ParsedTable;
  tables: TableOption[];
};

export function EditControlsSection({ parsedTable, tables }: Props) {
  const { deleteField } = useDeleteEntityDsl();
  const { renameField } = useRenameFieldDsl();
  const { addField, editExpression } = useFieldEditDsl();

  const [form] = Form.useForm();

  const fieldsByTable = useMemo(() => {
    const m = new Map<string, SelectOption[]>();
    tables.forEach((t) => m.set(t.value, t.fields));

    return m;
  }, [tables]);

  const tableOptions: SelectOption[] = useMemo(
    () => tables.map(({ value, label }) => ({ value, label })),
    [tables],
  );

  const initialControls: ControlRow[] = useMemo(() => {
    const isTableRef = (x: unknown): x is TableReferenceExpression =>
      x instanceof TableReferenceExpression;

    const isFieldRef = (x: unknown): x is FieldReferenceExpression =>
      x instanceof FieldReferenceExpression;

    const parseFieldToControl = (
      field: (typeof parsedTable.fields)[number],
    ): ControlRow | null => {
      const expr = field.expression;
      if (!expr) return null;

      const fx = findFunctionExpressions(expr).find(
        (f) =>
          (f.name === 'DROPDOWN' || f.name === 'CHECKBOX') &&
          f.arguments.length === 1,
      );
      if (!fx) return null;

      const type = fx.name.toLowerCase() as ControlType;
      const args = fx.arguments[0] as Expression[];
      if (args.length !== 3) return null;

      const [depArg, valueArg] = args;

      const dependency = isTableRef(depArg) ? depArg.tableName : null;

      let valueTable: string | null = null;
      let valueField: string | null = null;

      if (isFieldRef(valueArg)) {
        valueField = SheetReader.stripQuotes(valueArg.fieldName);
        if (isTableRef(valueArg.expression)) {
          valueTable = valueArg.expression.tableName;
        }
      }

      if (!valueTable || !valueField) return null;

      return {
        type,
        name: field.key.fieldName,
        dependency,
        valueTable,
        valueField,
      };
    };

    return parsedTable.fields
      .map(parseFieldToControl)
      .filter((x): x is ControlRow => x !== null);
  }, [parsedTable]);

  const onRemoveControl = useCallback(
    (index: number, remove: (index: number | number[]) => void) => {
      const control = form.getFieldValue('controls')[index] as ControlRow;

      if (!control || !control.name) {
        remove(index);

        return;
      }

      deleteField(parsedTable.tableName, control.name);
    },
    [deleteField, form, parsedTable.tableName],
  );

  const handleSaveControl = useCallback(
    (payload: ControlWizardSaveProps) => {
      const { isNew, index, data, changedKeys } = payload;
      const { type, name, valueTable, valueField, dependency } = data;
      const { tableName } = parsedTable;
      const isNameChanged = changedKeys.includes('name');

      if (isNew || !isNameChanged) {
        const value = '';
        const dependencyArg = dependency ? dependency : '';
        const valuesTable = `${valueTable}[${valueField}]`;

        if (isNew) {
          const fieldText = `${name} = ${type}(${dependencyArg}, ${valuesTable}, ${value})`;
          addField(tableName, fieldText);

          return;
        }

        const expression = `${type}(${dependencyArg}, ${valuesTable}, ${value})`;
        editExpression(tableName, name, expression);

        return;
      }

      const control = form.getFieldValue('controls')[index] as ControlRow;
      const initialControl = initialControls[index];
      if (!control || !initialControl) return;

      if (changedKeys.includes('name')) {
        renameField(tableName, initialControl.name, data.name);
      }
    },
    [addField, editExpression, form, initialControls, parsedTable, renameField],
  );

  useEffect(() => {
    form.setFieldsValue({ controls: initialControls });
  }, [initialControls, form]);

  return (
    <Form form={form}>
      <Form.List name="controls">
        {(fields, { add, remove }) => (
          <div className="flex flex-col gap-3 px-3 py-2">
            {fields.map(({ key, name, ...restField }) => (
              <ControlRowForm
                fieldKey={key}
                fieldsByTable={fieldsByTable}
                key={key}
                nameIndex={name}
                restField={restField}
                tableOptions={tableOptions}
                onRemove={(index) => onRemoveControl(index, remove)}
                onSave={handleSaveControl}
              />
            ))}

            <AddControlButton add={add} />
          </div>
        )}
      </Form.List>
    </Form>
  );
}
