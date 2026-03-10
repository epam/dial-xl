import { Collapse, Form, Input, InputNumber } from 'antd';
import { CollapseProps } from 'antd/es/collapse/Collapse';
import cx from 'classnames';
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { inputClasses } from '@frontend/common';

import { useControlEditDsl, useGridApi } from '../../../../hooks';
import { CollapseIcon } from '../../Chart/Components';
import { CreateControlsSection } from './CreateControlsSection';
import {
  ControlRow,
  ControlWizardCollapseSection,
  ControlWizardForm,
  TableOption,
} from './utils';

const defaultControlName = 'Control1';
const minPlacement = 1;

type Props = {
  tables: TableOption[];
};

export function CreateControlWizard({ tables }: Props) {
  const { createControl } = useControlEditDsl();
  const gridApi = useGridApi();
  const [form] = Form.useForm<ControlWizardForm>();

  const [collapseActiveKeys, setCollapseActiveKeys] = useState<
    ControlWizardCollapseSection[]
  >([ControlWizardCollapseSection.Controls]);

  const onCollapseSectionChange = useCallback((activeKeys: string[]) => {
    setCollapseActiveKeys(activeKeys as ControlWizardCollapseSection[]);
  }, []);

  const handlePlacementKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const { key, ctrlKey, altKey, metaKey } = event;
      if (ctrlKey || altKey || metaKey) return;
      if (key.length === 1 && !/^\d$/.test(key)) event.preventDefault();
    },
    [],
  );

  const handleAutoSave = useCallback(() => {
    const hasErrors = form
      .getFieldsError()
      .some(({ errors }) => errors.length > 0);

    if (hasErrors) return;

    const fieldsValue = form.getFieldsValue();

    const fieldsValueControls: any[] = fieldsValue.controls ?? [];
    const requiredFilled =
      !!fieldsValue.controlName &&
      fieldsValueControls.length > 0 &&
      fieldsValueControls.every(
        (c) => c && c.type && c.name && c.valueTable && c.valueField,
      );

    if (!requiredFilled) return;

    const controls: ControlRow[] =
      fieldsValue.controls?.map((control) => ({
        type: control.type,
        name: control.name,
        dependency: control.dependency || null,
        valueTable: control.valueTable || null,
        valueField: control.valueField || null,
      })) || [];

    createControl(
      fieldsValue.controlName,
      fieldsValue.startColumn || -1,
      fieldsValue.startRow || -1,
      controls,
    );
  }, [createControl, form]);

  const handleControlSave = useCallback(() => {
    setTimeout(handleAutoSave, 0);
  }, [handleAutoSave]);

  // Auto-save when control name changes
  useEffect(() => {
    const subscription = form
      .getFieldInstance('controlName')
      ?.onFieldsChange?.(() => {
        setTimeout(handleAutoSave, 0);
      });

    return subscription;
  }, [form, handleAutoSave]);

  useEffect(() => {
    if (!gridApi) return;

    const selection = gridApi.selection$.getValue();
    if (!selection) return;
  }, [form, gridApi]);

  const collapseItems = useMemo((): CollapseProps['items'] => {
    let initialRow: number | undefined;
    let initialCol: number | undefined;

    if (gridApi) {
      const selection = gridApi.selection$.getValue();
      if (selection) {
        initialRow = selection.startRow;
        initialCol = selection.startCol;
      }
    }

    return [
      {
        key: ControlWizardCollapseSection.TableName,
        label: 'Control group name',
        forceRender: true,
        children: (
          <Form.Item<ControlWizardForm>
            name="controlName"
            rules={[
              { required: true, message: 'Please enter control group name' },
            ]}
          >
            <Input
              className={cx('h-7 text-[13px]', inputClasses)}
              id="controlName"
              placeholder="Control group name"
            />
          </Form.Item>
        ),
      },
      {
        key: ControlWizardCollapseSection.Location,
        label: 'Location',
        forceRender: true,
        children: (
          <div className="flex flex-col px-3">
            <div className="flex items-center mb-2">
              <span className="min-w-[120px] text-[13px] text-text-primary">
                Start row
              </span>
              <Form.Item<ControlWizardForm>
                className="mb-0"
                initialValue={initialRow}
                name="startRow"
              >
                <InputNumber
                  className={cx('h-7 w-max-[350px] text-[13px]', inputClasses)}
                  id="startRow"
                  min={minPlacement}
                  placeholder="Start row"
                  onKeyDown={handlePlacementKeyDown}
                />
              </Form.Item>
            </div>

            <div className="flex items-center mb-2">
              <span className="min-w-[120px] text-[13px] text-text-primary">
                Start column
              </span>
              <Form.Item<ControlWizardForm>
                className="mb-0"
                initialValue={initialCol}
                name="startColumn"
              >
                <InputNumber
                  className={cx('h-7 w-max-[350px] text-[13px]', inputClasses)}
                  id="startColumn"
                  min={minPlacement}
                  placeholder="Start column"
                  onKeyDown={handlePlacementKeyDown}
                />
              </Form.Item>
            </div>
          </div>
        ),
      },
      {
        key: ControlWizardCollapseSection.Controls,
        label: 'Controls',
        forceRender: true,
        children: (
          <CreateControlsSection tables={tables} onSave={handleControlSave} />
        ),
      },
    ];
  }, [gridApi, handleControlSave, handlePlacementKeyDown, tables]);

  return (
    <Form<ControlWizardForm>
      form={form}
      initialValues={{
        controlName: defaultControlName,
        startRow: undefined,
        startColumn: undefined,
        controls: [
          {
            name: '',
            type: 'dropdown',
            dependency: null,
            valueTable: null,
            valueField: null,
          },
        ],
      }}
      layout="vertical"
    >
      <div className="flex items-center justify-between gap-2 py-2">
        <h2 className="text-[13px] text-text-primary font-semibold px-4 py-2">
          Create Control
        </h2>
      </div>

      <Collapse
        activeKey={collapseActiveKeys}
        collapsible="header"
        destroyOnHidden={false}
        expandIcon={CollapseIcon}
        items={collapseItems}
        onChange={onCollapseSectionChange}
      />
    </Form>
  );
}
