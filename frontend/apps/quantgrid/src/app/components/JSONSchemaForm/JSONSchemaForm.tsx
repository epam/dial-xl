import cx from 'classnames';
import { ReactNode } from 'react';

import {
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  ProtoStruct,
} from '@frontend/common';
import Form from '@rjsf/antd';
import { ErrorTransformer, RJSFSchema, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';

import {
  AddButton,
  ClearButton,
  CopyButton,
  MoveDownButton,
  MoveUpButton,
  RemoveButton,
} from './ButtonTemplates';
import {
  ArrayFieldItemTemplate,
  ArrayFieldTemplate,
  ArrayFieldTitleTemplate,
  BaseInputTemplate,
  DescriptionTemplate,
  FieldTemplate,
  ObjectFieldTemplate,
} from './Templates';
import { SelectWidget } from './Widgets';

const templates: any = {
  ArrayFieldItemTemplate,
  ArrayFieldTemplate,
  ArrayFieldTitleTemplate,
  BaseInputTemplate,
  DescriptionFieldTemplate: DescriptionTemplate,
  FieldTemplate,
  ObjectFieldTemplate,
  ButtonTemplates: {
    AddButton,
    ClearButton,
    CopyButton,
    MoveDownButton,
    MoveUpButton,
    RemoveButton,
  },
};

const widgets: any = {
  SelectWidget: SelectWidget,
};

const uiSchema: UiSchema = {
  'ui:submitButtonOptions': {
    props: {
      className: cx(
        modalFooterButtonClasses,
        primaryButtonClasses,
        primaryDisabledButtonClasses,
        'right-0',
      ),
    },
    norender: true,
  },
};

const transformErrors: ErrorTransformer = (errors) => {
  return errors.map((error) => {
    if (error.name === 'required') {
      error.message = `The field '${error.property}' cannot be empty`;
    }

    return error;
  });
};

interface Props {
  children: ReactNode;
  form: ProtoStruct | null;
  schema: RJSFSchema;
  onSubmit?: (form: unknown) => void;
  onChange?: (form: unknown) => void;
}

export function JSONSchemaForm({
  children,
  form,
  schema,
  onChange,
  onSubmit,
}: Props) {
  return (
    <Form
      formContext={{
        descriptionLocation: 'tooltip',
      }}
      formData={form}
      schema={schema}
      showErrorList={false}
      templates={templates}
      transformErrors={transformErrors}
      uiSchema={uiSchema}
      validator={validator}
      widgets={widgets}
      onChange={onChange}
      onSubmit={onSubmit}
    >
      {children}
    </Form>
  );
}
