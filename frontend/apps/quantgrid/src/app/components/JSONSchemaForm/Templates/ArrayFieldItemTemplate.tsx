import { Col, Row, Space } from 'antd';

import {
  ArrayFieldItemTemplateProps,
  FormContextType,
  RJSFSchema,
  StrictRJSFSchema,
} from '@rjsf/utils';

import { ArrayFieldItemButtonsTemplate } from './ArrayFieldItemButtonsTemplate';

const BTN_GRP_STYLE = {
  width: '100%',
};

const BTN_STYLE = {
  width: 'calc(100% / 4)',
};

/** The `ArrayFieldItemTemplate` component is the template used to render an item of an array.
 * Uses a stable ArrayFieldItemButtonsTemplate import to avoid "Cannot create components during render".
 *
 * @param props - The `ArrayFieldItemTemplateProps` props for the component
 */
export function ArrayFieldItemTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: ArrayFieldItemTemplateProps<T, S, F>) {
  const {
    buttonsProps,
    children,
    displayLabel,
    hasDescription,
    hasToolbar,
    itemKey,
    registry,
  } = props;
  const { rowGutter = 24, toolbarAlign = 'bottom' } = registry.formContext;
  const margin = hasDescription ? -8 : 16;

  return (
    <Row
      align={toolbarAlign}
      gutter={rowGutter}
      justify="end"
      key={`array-item-${itemKey}`}
    >
      <Col flex="1">{children}</Col>

      {hasToolbar && (
        <Col
          flex="192px"
          style={{ marginTop: displayLabel ? `${margin}px` : undefined }}
        >
          <Space.Compact style={BTN_GRP_STYLE}>
            <ArrayFieldItemButtonsTemplate
              {...buttonsProps}
              style={BTN_STYLE}
            />
          </Space.Compact>
        </Col>
      )}
    </Row>
  );
}
