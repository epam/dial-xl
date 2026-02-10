import { Form, Input, Tooltip } from 'antd';
import cx from 'classnames';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import Icon from '@ant-design/icons';
import {
  CheckboxControlIcon,
  DropdownControlIcon,
  inputClasses,
  TrashIcon,
} from '@frontend/common';
import type { DefaultOptionType } from '@rc-component/select/lib/Select';

import { FormSelect } from './FormSelect';
import { ControlRow, ControlWizardSaveProps } from './utils';

const typeOptions = [
  {
    value: 'dropdown',
    label: 'Dropdown',
    icon: <DropdownControlIcon />,
  },
  {
    value: 'checkbox',
    label: 'Checkbox',
    icon: <CheckboxControlIcon />,
  },
];

type ControlRowProps = {
  nameIndex: number;
  fieldKey: number;
  onRemove?: (nameIndex: number) => void;
  fieldsByTable: Map<string, DefaultOptionType[]>;
  tableOptions: DefaultOptionType[];
  restField: any;
  onSave?: (payload: ControlWizardSaveProps) => void;
};

export function ControlRowForm({
  restField,
  nameIndex,
  fieldKey,
  onRemove,
  fieldsByTable,
  tableOptions,
  onSave,
}: ControlRowProps) {
  const form = Form.useFormInstance();

  const row = Form.useWatch(['controls', nameIndex], { form });

  const prevRef = useRef<ControlRow | undefined>(undefined);
  const initialValidRef = useRef(false);
  const createdRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!onSave) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    const snap = form.getFieldValue(['controls', nameIndex]) as
      | ControlRow
      | undefined;
    initialValidRef.current = isValidControl(snap);
    if (initialValidRef.current) createdRef.current = true;
    prevRef.current = snap;
  }, [onSave, form, nameIndex]);

  const paths = useMemo(
    () =>
      [
        ['controls', nameIndex, 'type'],
        ['controls', nameIndex, 'name'],
        ['controls', nameIndex, 'dependency'],
        ['controls', nameIndex, 'valueTable'],
        ['controls', nameIndex, 'valueField'],
      ] as const,
    [nameIndex],
  );

  const save = useCallback(
    (changedHint?: (keyof ControlRow)[]) => {
      if (!onSave) return;

      const snap = form.getFieldValue(['controls', nameIndex]) as
        | ControlRow
        | undefined;
      if (!snap) return;

      const anyTouched = paths.some((p) => form.isFieldTouched(p));
      if (!anyTouched) return;

      const nowValid = isValidControl(snap);
      if (!nowValid) {
        prevRef.current = snap;

        return;
      }

      const changedKeys =
        changedHint && changedHint.length
          ? changedHint
          : shallowDiffKeys(prevRef.current, snap);
      if (changedKeys.length === 0) return;

      form
        .validateFields(paths as any, { validateOnly: true })
        .then(() => {
          const isNew =
            !initialValidRef.current && !createdRef.current && nowValid;
          onSave({ index: nameIndex, data: snap, changedKeys, isNew });
          prevRef.current = snap;
          if (isNew) createdRef.current = true;
        })
        .catch(() => {});
    },
    [form, nameIndex, onSave, paths],
  );

  const tableOptsMerged = useMemo(
    () => mergeOption(tableOptions, row?.valueTable ?? null),
    [tableOptions, row?.valueTable],
  );

  const fieldOptions = useMemo(() => {
    const base = row?.valueTable
      ? (fieldsByTable.get(row.valueTable) ?? [])
      : [];

    return mergeOption(base, row?.valueField ?? null);
  }, [fieldsByTable, row?.valueTable, row?.valueField]);

  const depOptionsMerged = useMemo(() => {
    const valueTable = row?.valueTable;

    const base = valueTable
      ? tableOptions.filter((o) => o.value === valueTable)
      : tableOptions;

    return mergeOption(base, row?.dependency ?? null);
  }, [row?.valueTable, row?.dependency, tableOptions]);

  const onValueTableChange = useCallback(
    (newTable: string | null) => {
      const controlPath: (string | number)[] = ['controls', nameIndex];
      const snap = form.getFieldValue(controlPath) as
        | Partial<ControlRow>
        | undefined;

      const prevField = snap?.valueField;
      const prevDependency = snap?.dependency;

      const newFieldOptions = newTable
        ? (fieldsByTable.get(newTable) ?? [])
        : [];

      const hasPrevField =
        prevField != null && newFieldOptions.some((o) => o.value === prevField);

      const next: Partial<ControlRow> = {
        ...snap,
        valueTable: newTable,
      };

      const changedKeys: (keyof ControlRow)[] = ['valueTable'];

      if (!hasPrevField) {
        next.valueField = undefined;
        changedKeys.push('valueField');
      }

      if (prevDependency && prevDependency !== newTable) {
        next.dependency = undefined;
        changedKeys.push('dependency');
      }

      form.setFieldsValue({
        controls: {
          [nameIndex]: next,
        },
      });

      save(changedKeys);
    },
    [fieldsByTable, form, nameIndex, save],
  );

  return (
    <div
      className="rounded-[3px] bg-bg-layer-2 p-3 border border-stroke-primary"
      key={fieldKey}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] text-text-secondary">
          Control #{nameIndex + 1}
        </div>
        <Tooltip placement="top" title="Remove control" destroyOnHidden>
          <button
            className="flex items-center"
            onClick={() => onRemove?.(nameIndex)}
          >
            <Icon
              className="w-[18px] ml-2 text-text-secondary hover:text-text-accent-primary"
              component={() => <TrashIcon />}
            />
          </button>
        </Tooltip>
      </div>

      {/* Type */}
      <div className="flex items-center gap-3 mb-2">
        <span className="min-w-[80px] text-[13px] text-text-primary">
          Type&nbsp;<span className="text-text-error">*</span>
        </span>
        <Form.Item
          className="mb-0 w-full"
          name={[nameIndex, 'type']}
          rules={[{ required: true, message: 'Select type' }]}
        >
          <FormSelect
            options={typeOptions}
            placeholder="Type"
            showIcon={true}
            onValueChange={() => save(['type'])}
          />
        </Form.Item>
      </div>

      {/* Name */}
      <div className="flex items-center gap-3 mb-2">
        <span className="min-w-[80px] text-[13px] text-text-primary">
          Name&nbsp;<span className="text-text-error">*</span>
        </span>
        <Form.Item
          {...restField}
          className="mb-0 grow"
          name={[nameIndex, 'name']}
          rules={[{ required: true, message: 'Please enter control name' }]}
        >
          <Input
            className={cx('h-9 text-[13px]', inputClasses)}
            placeholder="Control name"
            onBlur={() => save(['name'])}
          />
        </Form.Item>
      </div>

      {/* Dependency (optional) */}
      <div className="flex items-center gap-3 mb-2">
        <span className="min-w-[80px] text-[13px] text-text-primary">
          Dependency
        </span>
        <Form.Item
          {...restField}
          className="mb-0 w-full"
          name={[nameIndex, 'dependency']}
        >
          <FormSelect
            options={depOptionsMerged}
            placeholder="Dependency table"
            onValueChange={() => save(['dependency'])}
          />
        </Form.Item>
      </div>

      {/* Values: Table + Field */}
      <div className="flex items-start gap-3">
        <span className="min-w-[80px] text-[13px] text-text-primary">
          Values&nbsp;<span className="text-text-error">*</span>
        </span>

        <div className="flex flex-col gap-2 w-full">
          {/* Table */}
          <Form.Item
            {...restField}
            className="mb-0"
            name={[nameIndex, 'valueTable']}
            rules={[{ required: true, message: 'Select table' }]}
          >
            <FormSelect
              options={tableOptsMerged}
              placeholder="Table"
              onValueChange={onValueTableChange}
            />
          </Form.Item>

          {/* Field */}
          <Form.Item
            {...restField}
            shouldUpdate={(prev, cur) =>
              prev?.controls?.[nameIndex]?.valueTable !==
              cur?.controls?.[nameIndex]?.valueTable
            }
            noStyle
          >
            {() => (
              <Form.Item
                {...restField}
                className="mb-0"
                name={[nameIndex, 'valueField']}
                rules={[{ required: true, message: 'Select field' }]}
              >
                <FormSelect
                  options={fieldOptions}
                  placeholder="Field"
                  onValueChange={() => save(['valueField', 'dependency'])}
                />
              </Form.Item>
            )}
          </Form.Item>
        </div>
      </div>
    </div>
  );
}

function mergeOption(
  options: DefaultOptionType[],
  value: string | null | undefined,
) {
  if (!value) return options;
  const exists = options.some((o) => o?.value === value);

  return exists ? options : [{ value, label: value }, ...options];
}

function isValidControl(c?: Partial<ControlRow>) {
  return !!(c && c.type && c.name && c.valueTable && c.valueField);
}

function shallowDiffKeys(
  a: Partial<ControlRow> | undefined,
  b: Partial<ControlRow> | undefined,
) {
  const changed: (keyof ControlRow)[] = [];
  for (const k of trackKeys) {
    if ((a?.[k] ?? null) !== (b?.[k] ?? null)) changed.push(k);
  }

  return changed;
}

const trackKeys: Array<keyof ControlRow> = [
  'type',
  'name',
  'valueTable',
  'valueField',
  'dependency',
];
