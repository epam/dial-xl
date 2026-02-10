import { Button, Form, Input, Spin } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import isEqual from 'react-fast-compare';

import {
  filesEndpointType,
  ImportDefinition,
  ImportSource,
  inputClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  ProtoStruct,
  secondaryButtonClasses,
  secondaryDisabledButtonClasses,
} from '@frontend/common';
import { RJSFSchema } from '@rjsf/utils';

import { ProjectContext } from '../../../context';
import { useApiRequests, useUnsavedChanges } from '../../../hooks';
import {
  constructPath,
  encodeApiUrl,
  isEntityNameInvalid,
} from '../../../utils';
import { JSONSchemaForm } from '../../JSONSchemaForm';

interface Props {
  isUpdate: boolean;
  selectedDefinition: ImportDefinition;
  formData: ProtoStruct;
  sourceName: string;
  importSources: Record<string, ImportSource>;
  onDataChanged: (isChanged: boolean) => void;
  onSaveConfiguration: (configuration: ProtoStruct, sourceName: string) => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
}

export const ImportStep2 = ({
  isUpdate,
  selectedDefinition,
  sourceName,
  importSources,
  formData,
  onSaveConfiguration,
  onDataChanged,
  onPreviousStep,
  onNextStep,
}: Props) => {
  const [form] = Form.useForm();

  const { projectName, projectBucket, projectPath } =
    useContext(ProjectContext);
  const { getImportDefinition } = useApiRequests();
  const [schema, setSchema] = useState<RJSFSchema | null>(null);
  const [localConfiguration, setLocalConfiguration] =
    useState<ProtoStruct>(formData);
  const [localSourceName, setLocalSourceName] = useState<string>(sourceName);

  const projectPathApi = useMemo(
    () =>
      encodeApiUrl(
        constructPath([
          filesEndpointType,
          projectBucket,
          projectPath,
          projectName,
        ])
      ),
    [projectBucket, projectName, projectPath]
  );

  const isChanged = useMemo(
    () =>
      sourceName !== localSourceName || !isEqual(formData, localConfiguration),
    [formData, localConfiguration, localSourceName, sourceName]
  );

  useUnsavedChanges(isChanged);

  const isDuplicate = useCallback(
    (raw?: string) => {
      const name = (raw ?? '').trim().toLowerCase();
      if (!name) return false;

      const initial = sourceName?.trim().toLowerCase();
      if (initial && name === initial) return false;

      const byKey = Object.keys(importSources ?? {}).some(
        (k) => k.trim().toLowerCase() === name
      );

      const byValue = Object.values(importSources ?? {}).some((s: any) => {
        const n = (s?.name ?? s?.sourceName ?? '')
          .toString()
          .trim()
          .toLowerCase();

        return !!n && n === name;
      });

      return byKey || byValue;
    },
    [importSources, sourceName]
  );

  useEffect(() => {
    if (!selectedDefinition) return;

    const handle = async () => {
      const definition = await getImportDefinition({
        project: projectPathApi,
        definition: selectedDefinition.definition,
      });

      setSchema(definition?.specification as RJSFSchema);
    };

    handle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDefinition]);

  useEffect(() => {
    onDataChanged(isChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChanged]);

  if (!schema)
    return (
      <div className="flex items-center justify-center max-h-[480px] min-h-[250px]">
        <Spin size="large" />
      </div>
    );

  return (
    <div className="relative flex flex-col max-h-[480px] min-h-[250px] pb-12">
      <div className="text-text-primary flex flex-col gap-3 pb-5 overflow-y-auto overflow-x-hidden thin-scrollbar ">
        <Form
          className="pb-2"
          form={form}
          initialValues={{
            sourceName,
          }}
          layout="vertical"
          onChange={() => {
            setLocalSourceName(form.getFieldValue('sourceName'));
          }}
        >
          <Form.Item
            label={
              <span className="text-text-primary">
                <span className="text-text-error">*</span> Source name
              </span>
            }
            name="sourceName"
            normalize={(v) => (typeof v === 'string' ? v.trimStart() : v)}
            required={false}
            rules={[
              { required: true, message: 'Source name is required' },
              {
                validator: (_, value: string) => {
                  const v = (value ?? '').trim();

                  if (v && isEntityNameInvalid(v, true)) {
                    return Promise.reject(new Error('Invalid name format'));
                  }

                  if (isDuplicate(v)) {
                    return Promise.reject(
                      new Error('Source with this name already exists')
                    );
                  }

                  return Promise.resolve();
                },
              },
            ]}
            validateTrigger={['onBlur', 'onChange']}
          >
            <Input className={inputClasses} />
          </Form.Item>
        </Form>
        <JSONSchemaForm
          form={localConfiguration}
          schema={schema}
          onChange={(form) => setLocalConfiguration((form as any).formData)}
          onSubmit={async (schemaForm) => {
            await form.validateFields();

            if (form.getFieldError('sourceName').length) return;

            onSaveConfiguration(
              (schemaForm as any).formData as ProtoStruct,
              form.getFieldValue('sourceName')
            );
            onNextStep();
          }}
        >
          <div className="flex flex-col justify-end absolute bottom-0 right-0 w-full bg-bg-layer-3 z-10">
            <hr className="border-stroke-tertiary w-[calc(100%+48px)] -ml-6" />
            <div className="flex justify-end gap-4 mt-4">
              <Button
                className={classNames(
                  secondaryButtonClasses,
                  secondaryDisabledButtonClasses
                )}
                disabled={isUpdate}
                onClick={onPreviousStep}
              >
                Previous
              </Button>
              <Button
                className={classNames(
                  primaryButtonClasses,
                  primaryDisabledButtonClasses
                )}
                htmlType="submit"
                onClick={async () => {
                  await form.validateFields();
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </JSONSchemaForm>
      </div>
    </div>
  );
};
