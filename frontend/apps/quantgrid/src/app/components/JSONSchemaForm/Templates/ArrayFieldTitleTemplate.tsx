import { ConfigProvider, Tooltip } from 'antd';
import classNames from 'classnames';
import { useContext } from 'react';
import sanitize from 'sanitize-html';

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
  F extends FormContextType = any
>({
  required,
  registry,
  title,
  idSchema,
  description,
}: ArrayFieldTitleProps<T, S, F> & { description?: string }) {
  const { formContext } = registry;
  const { colon = true } = formContext;

  let labelChildren = title;
  if (colon && typeof title === 'string' && title.trim() !== '') {
    labelChildren = title.replace(/[：:]\s*$/, '');
  }

  const handleLabelClick = () => {
    if (!idSchema.$id) {
      return;
    }

    const control: HTMLLabelElement | null = document.querySelector(
      `[id="${idSchema.$id}"]`
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

  return title ? (
    <label
      className={labelClassName}
      htmlFor={idSchema.$id}
      title={typeof title === 'string' ? title : ''}
      onClick={handleLabelClick}
    >
      {labelChildren}
      {description && (
        <Tooltip
          title={
            <div
              dangerouslySetInnerHTML={{ __html: sanitize(description) }}
            ></div>
          }
          destroyOnHidden
        >
          <Icon
            className={classNames(
              iconClasses,
              'w-[18px] ml-1 hover:cursor-help hover:text-text-accent-primary'
            )}
            component={() => <QuestionIcon />}
          />
        </Tooltip>
      )}
    </label>
  ) : null;
}
