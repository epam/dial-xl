import { Col, ConfigProvider, Row } from 'antd';
import classNames from 'classnames';
import { useContext } from 'react';

import { primaryButtonClasses } from '@frontend/common/lib';
import {
  buttonId,
  canExpand,
  FormContextType,
  GenericObjectType,
  getUiOptions,
  ObjectFieldTemplatePropertyType,
  ObjectFieldTemplateProps,
  RJSFSchema,
  StrictRJSFSchema,
  titleId,
  UiSchema,
} from '@rjsf/utils';

import { TitleFieldTemplate } from './TitleFieldTemplate';

const isObject = (val: unknown): val is object =>
  typeof val === 'object' && val !== null && !Array.isArray(val);

const isNumber = (val: unknown): val is number =>
  typeof val === 'number' && !isNaN(val);

const isString = (val: unknown): val is string => typeof val === 'string';

/** The `ObjectFieldTemplate` is the template to use to render all the inner properties of an object along with the
 * title and description if available. If the object is expandable, then an `AddButton` is also rendered after all
 * the properties.
 *
 * @param props - The `ObjectFieldTemplateProps` for this component
 */
export function ObjectFieldTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: ObjectFieldTemplateProps<T, S, F>) {
  const {
    description,
    disabled,
    fieldPathId,
    formData,
    onAddProperty,
    optionalDataControl,
    properties,
    readonly,
    required,
    registry,
    schema,
    title,
    uiSchema,
  } = props;
  const showOptionalDataControlInTitle = !readonly && !disabled;
  const {
    ButtonTemplates: { AddButton },
  } = registry.templates;
  const {
    colSpan = 24,
    labelAlign = 'right',
    rowGutter = 24,
  } = registry.formContext as GenericObjectType;

  const findSchema = (element: ObjectFieldTemplatePropertyType): S =>
    // TODO: fix types
    (element.content.props as any).schema;

  const findSchemaType = (element: ObjectFieldTemplatePropertyType) =>
    findSchema(element).type;

  const findUiSchema = (
    element: ObjectFieldTemplatePropertyType,
    // TODO: fix types
  ): UiSchema<T, S, F> | undefined => (element.content.props as any).uiSchema;

  const findUiSchemaField = (element: ObjectFieldTemplatePropertyType) =>
    getUiOptions(findUiSchema(element)).field;

  const findUiSchemaWidget = (element: ObjectFieldTemplatePropertyType) =>
    getUiOptions(findUiSchema(element)).widget;

  const calculateColSpan = (element: ObjectFieldTemplatePropertyType) => {
    const type = findSchemaType(element);
    const field = findUiSchemaField(element);
    const widget = findUiSchemaWidget(element);

    const defaultColSpan =
      properties.length < 2 || // Single or no field in object.
      type === 'object' ||
      type === 'array' ||
      widget === 'textarea'
        ? 24
        : 12;

    if (isObject(colSpan)) {
      const colSpanObj: GenericObjectType = colSpan;
      if (isString(widget)) {
        return colSpanObj[widget];
      }
      if (isString(field)) {
        return colSpanObj[field];
      }
      if (isString(type)) {
        return colSpanObj[type];
      }
    }
    if (isNumber(colSpan)) {
      return colSpan;
    }

    return defaultColSpan;
  };

  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext);
  const prefixCls = getPrefixCls('form');
  const labelClsBasic = `${prefixCls}-item-label`;
  const labelColClassName = classNames(
    labelClsBasic,
    labelAlign === 'left' && `${labelClsBasic}-left`,
  );

  return (
    <fieldset id={fieldPathId.$id}>
      <Row gutter={rowGutter}>
        {title && (
          <Col className={labelColClassName} span={24}>
            <TitleFieldTemplate
              description={
                typeof description === 'string' ? description : undefined
              }
              id={titleId(fieldPathId)}
              optionalDataControl={
                showOptionalDataControlInTitle ? optionalDataControl : undefined
              }
              registry={registry}
              required={required}
              schema={schema}
              title={title}
              uiSchema={uiSchema}
            />
          </Col>
        )}
        {!showOptionalDataControlInTitle ? (
          <Col span={24}>{optionalDataControl}</Col>
        ) : undefined}
        {properties
          .filter((e) => !e.hidden)
          // Support custom order property
          .sort((a, b) => {
            // TODO: fix types
            const aOrder = (a.content.props as any).schema.order;
            const bOrder = (b.content.props as any).schema.order;

            if (aOrder !== undefined && bOrder === undefined) return -1;
            if (aOrder === undefined && bOrder !== undefined) return 1;
            if (aOrder !== undefined && bOrder !== undefined)
              return aOrder - bOrder;

            return 0;
          })
          .map((element: ObjectFieldTemplatePropertyType) => (
            <Col key={element.name} span={calculateColSpan(element)}>
              {element.content}
            </Col>
          ))}
      </Row>

      {canExpand(schema, uiSchema, formData) && (
        <Col span={24}>
          <Row gutter={rowGutter} justify="end">
            <Col className="mt-3" flex="192px">
              <AddButton
                className={classNames(
                  'object-property-expand',
                  primaryButtonClasses,
                )}
                disabled={disabled || readonly}
                id={buttonId(fieldPathId, 'add')}
                registry={registry}
                uiSchema={uiSchema}
                onClick={onAddProperty}
              />
            </Col>
          </Row>
        </Col>
      )}
    </fieldset>
  );
}
