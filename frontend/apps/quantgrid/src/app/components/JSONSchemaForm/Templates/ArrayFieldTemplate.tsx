import { Col, ConfigProvider, Row } from 'antd';
import classNames from 'classnames';
import { useContext } from 'react';

import { primaryButtonClasses } from '@frontend/common/lib';
import {
  ArrayFieldTemplateProps,
  buttonId,
  FormContextType,
  GenericObjectType,
  getUiOptions,
  RJSFSchema,
  StrictRJSFSchema,
} from '@rjsf/utils';

import { ArrayFieldTitleTemplate } from './ArrayFieldTitleTemplate';

/** The `ArrayFieldTemplate` component is the template used to render all items in an array.
 *
 * @param props - The `ArrayFieldTemplateProps` for the component
 */
export function ArrayFieldTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: ArrayFieldTemplateProps<T, S, F>) {
  const {
    canAdd,
    className,
    disabled,
    fieldPathId,
    items,
    optionalDataControl,
    onAddClick,
    readonly,
    registry,
    required,
    schema,
    title,
    uiSchema,
  } = props;
  const uiOptions = getUiOptions<T, S, F>(uiSchema);
  const showOptionalDataControlInTitle = !readonly && !disabled;
  const {
    ButtonTemplates: { AddButton },
  } = registry.templates;
  const { labelAlign = 'right', rowGutter = 24 } =
    registry.formContext as GenericObjectType;

  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext);
  const prefixCls = getPrefixCls('form');
  const labelClsBasic = `${prefixCls}-item-label`;
  const labelColClassName = classNames(
    labelClsBasic,
    labelAlign === 'left' && `${labelClsBasic}-left`,
  );

  return (
    <fieldset className={className} id={fieldPathId.$id}>
      <Row gutter={rowGutter}>
        {(uiOptions.title || title) && (
          <Col className={labelColClassName} span={24}>
            <ArrayFieldTitleTemplate
              description={uiOptions.description || schema.description}
              fieldPathId={fieldPathId}
              optionalDataControl={
                showOptionalDataControlInTitle ? optionalDataControl : undefined
              }
              registry={registry}
              required={required}
              schema={schema}
              title={uiOptions.title || title}
              uiSchema={uiSchema}
            />
          </Col>
        )}
        <Col className="row array-item-list" span={24}>
          {!showOptionalDataControlInTitle ? optionalDataControl : undefined}
          {items}
        </Col>

        {canAdd && (
          <Col span={24}>
            <Row gutter={rowGutter} justify="end">
              <Col className="mt-3" flex={'192px'}>
                <AddButton
                  className={classNames('array-item-add', primaryButtonClasses)}
                  disabled={disabled || readonly}
                  id={buttonId(fieldPathId, 'add')}
                  registry={registry}
                  uiSchema={uiSchema}
                  onClick={onAddClick}
                />
              </Col>
            </Row>
          </Col>
        )}
      </Row>
    </fieldset>
  );
}
