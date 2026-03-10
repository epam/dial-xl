import { Col, ConfigProvider, Divider, Row, Tooltip } from 'antd';
import classNames from 'classnames';
import DOMPurify from 'dompurify';
import { useContext } from 'react';

import Icon from '@ant-design/icons';
import { iconClasses, QuestionIcon } from '@frontend/common/lib';
import {
  FormContextType,
  RJSFSchema,
  StrictRJSFSchema,
  TitleFieldProps,
} from '@rjsf/utils';

/** The `TitleField` is the template to use to render the title of a field
 *
 * @param props - The `TitleFieldProps` for this component
 */
export function TitleFieldTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>({
  id,
  required,
  registry,
  title,
  description,
  optionalDataControl,
}: TitleFieldProps<T, S, F> & { description?: string }) {
  const { formContext } = registry;
  const { colon = true } = formContext;

  let labelChildren = title;
  if (colon && typeof title === 'string' && title.trim() !== '') {
    labelChildren = title.replace(/[：:]\s*$/, '');
  }

  const handleLabelClick = () => {
    if (!id) {
      return;
    }

    const control: HTMLLabelElement | null = document.querySelector(
      `[id="${id}"]`,
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

  let heading = title ? (
    <label
      className={labelClassName}
      htmlFor={id}
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
              'w-[18px] text-text-secondary ml-1 hover:cursor-help hover:text-text-accent-primary',
            )}
            component={() => <QuestionIcon />}
          />
        </Tooltip>
      )}
    </label>
  ) : null;

  if (optionalDataControl) {
    heading = (
      <Row>
        <Col flex="auto">{heading}</Col>
        <Col flex="none">{optionalDataControl}</Col>
      </Row>
    );
  }

  if (!heading) return null;

  return (
    <>
      {heading}
      <Divider size="small" style={{ marginBlock: '1px' }} />
    </>
  );
}
