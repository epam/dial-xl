import { Col, Row, Space } from 'antd';
import { twMerge } from 'tailwind-merge';

import {
  secondaryButtonClasses,
  secondaryDisabledButtonClasses,
} from '@frontend/common/lib';
import {
  ArrayFieldTemplateItemType,
  FormContextType,
  RJSFSchema,
  StrictRJSFSchema,
} from '@rjsf/utils';

const BTN_GRP_STYLE = {
  width: '100%',
};

const BTN_STYLE = {
  width: 'calc(100% / 4)',
};

/** The `ArrayFieldItemTemplate` component is the template used to render an items of an array.
 *
 * @param props - The `ArrayFieldTemplateItemType` props for the component
 */
export function ArrayFieldItemTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: ArrayFieldTemplateItemType<T, S, F>) {
  const {
    children,
    disabled,
    hasCopy,
    hasMoveDown,
    hasMoveUp,
    hasRemove,
    hasToolbar,
    index,
    onCopyIndexClick,
    onDropIndexClick,
    onReorderClick,
    readonly,
    registry,
    uiSchema,
  } = props;
  const { CopyButton, MoveDownButton, MoveUpButton, RemoveButton } =
    registry.templates.ButtonTemplates;
  const { rowGutter = 24, toolbarAlign = 'bottom' } = registry.formContext;

  return (
    <Row
      align={toolbarAlign}
      gutter={rowGutter}
      justify={'end'}
      key={`array-item-${index}`}
    >
      <Col flex="1">{children}</Col>

      {hasToolbar && (
        <Col flex="192px">
          <Space.Compact style={BTN_GRP_STYLE}>
            {(hasMoveUp || hasMoveDown) && (
              <MoveUpButton
                className={twMerge(
                  secondaryButtonClasses,
                  secondaryDisabledButtonClasses,
                  'rounded-none first:rounded-l-sm last:rounded-r-sm',
                )}
                disabled={disabled || readonly || !hasMoveUp}
                registry={registry}
                style={BTN_STYLE}
                uiSchema={uiSchema}
                onClick={onReorderClick(index, index - 1)}
              />
            )}
            {(hasMoveUp || hasMoveDown) && (
              <MoveDownButton
                className={twMerge(
                  secondaryButtonClasses,
                  secondaryDisabledButtonClasses,
                  'rounded-none first:rounded-l-sm last:rounded-r-sm',
                )}
                disabled={disabled || readonly || !hasMoveDown}
                registry={registry}
                style={BTN_STYLE}
                uiSchema={uiSchema}
                onClick={onReorderClick(index, index + 1)}
              />
            )}
            {hasCopy && (
              <CopyButton
                className={twMerge(
                  secondaryButtonClasses,
                  secondaryDisabledButtonClasses,
                  'rounded-none first:rounded-l-sm last:rounded-r-sm',
                )}
                disabled={disabled || readonly}
                registry={registry}
                style={BTN_STYLE}
                uiSchema={uiSchema}
                onClick={onCopyIndexClick(index)}
              />
            )}
            {hasRemove && (
              <RemoveButton
                className={twMerge(
                  secondaryButtonClasses,
                  secondaryDisabledButtonClasses,
                  'rounded-none first:rounded-l-sm last:rounded-r-sm !bg-bg-error',
                )}
                disabled={disabled || readonly}
                registry={registry}
                style={BTN_STYLE}
                uiSchema={uiSchema}
                onClick={onDropIndexClick(index)}
              />
            )}
          </Space.Compact>
        </Col>
      )}
    </Row>
  );
}
