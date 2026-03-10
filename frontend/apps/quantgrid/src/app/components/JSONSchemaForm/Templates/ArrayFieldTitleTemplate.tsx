import { Col, ConfigProvider, Row, Tooltip } from 'antd';
import classNames from 'classnames';
import DOMPurify from 'dompurify';
import { useContext } from 'react';

import Icon from '@ant-design/icons';
import { iconClasses, QuestionIcon } from '@frontend/common/lib';
import {
  ArrayFieldTitleProps,
  FormContextType,
  RJSFSchema,
  StrictRJSFSchema,
} from '@rjsf/utils';

/** The `ArrayFieldTitleTemplate` is the template to use to render the title of a field
 *
 * @param props - The `ArrayFieldTitleProps` for this component
 */
export function ArrayFieldTitleTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>({
  required,
  registry,
  title,
  fieldPathId,
  description,
  optionalDataControl,
}: ArrayFieldTitleProps<T, S, F> & { description?: string }) {
  const { formContext } = registry;
  const { colon = true } = formContext;

  let labelChildren = title;
  if (colon && typeof title === 'string' && title.trim() !== '') {
    labelChildren = title.replace(/[：:]\s*$/, '');
  }

  const handleLabelClick = () => {
    if (!fieldPathId?.$id) {
      return;
    }

    const control: HTMLLabelElement | null = document.querySelector(
      `[id="${fieldPathId.$id}"]`,
    );
    if (control && control.focus) {
      control.focus();
    }
  };

  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext);
  const prefixCls = getPrefixCls('form');
  const labelClassName = classNames({
    [`${prefixCls}-item-required`]: required,
    [`${prefixCls}-item-no-colon`]: !colon,
  });

  const labelElement = title ? (
    <label
      className={labelClassName}
      htmlFor={fieldPathId?.$id}
      title={typeof title === 'string' ? title : ''}
      onClick={handleLabelClick}
    >
      {labelChildren}
      {description && (
        <Tooltip
          title={
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(description),
              }}
            ></div>
          }
          destroyOnHidden
        >
          <Icon
            className={classNames(
              iconClasses,
              'w-[18px] ml-1 hover:cursor-help hover:text-text-accent-primary',
            )}
            component={() => <QuestionIcon />}
          />
        </Tooltip>
      )}
    </label>
  ) : null;

  if (!labelElement) return null;
  if (optionalDataControl) {
    return (
      <Row>
        <Col flex="auto">{labelElement}</Col>
        <Col flex="none">{optionalDataControl}</Col>
      </Row>
    );
  }

  return labelElement;
}
