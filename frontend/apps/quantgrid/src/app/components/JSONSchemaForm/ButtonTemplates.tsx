import { Button } from 'antd';
import { twMerge } from 'tailwind-merge';

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import {
  primaryButtonClasses,
  secondaryButtonClasses,
  secondaryDisabledButtonClasses,
} from '@frontend/common/lib';
import {
  FormContextType,
  IconButtonProps,
  RJSFSchema,
  StrictRJSFSchema,
  TranslatableString,
} from '@rjsf/utils';

const ARRAY_ITEM_BTN_STYLE = { width: 'calc(100% / 4)' };

const arrayItemBtnClass = twMerge(
  secondaryButtonClasses,
  secondaryDisabledButtonClasses,
  'rounded-none first:rounded-l-sm last:rounded-r-sm',
);

/** AddButton using in-app icon import to avoid "Element type is invalid: got object" from theme bundle. */
export function AddButton<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: IconButtonProps<T, S, F>) {
  const { className, color: _color, registry, type: _type, ...rest } = props;

  return (
    <Button
      className={twMerge(primaryButtonClasses, className)}
      icon={<PlusCircleOutlined />}
      title={registry.translateString(TranslatableString.AddItemButton)}
      type="primary"
      block
      {...rest}
    />
  );
}

/** RemoveButton using in-app icon import (e.g. for WrapIfAdditionalTemplate / array item toolbar). */
export function RemoveButton<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: IconButtonProps<T, S, F>) {
  const {
    className,
    color: _color,
    registry,
    style,
    type: _type,
    ...rest
  } = props;

  return (
    <Button
      className={twMerge(arrayItemBtnClass, 'bg-bg-error!', className)}
      icon={<DeleteOutlined />}
      style={{ ...ARRAY_ITEM_BTN_STYLE, ...style }}
      title={registry.translateString(TranslatableString.RemoveButton)}
      type="primary"
      danger
      {...rest}
    />
  );
}

/** ClearButton using in-app icon import (e.g. for BaseInputTemplate). */
export function ClearButton<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: IconButtonProps<T, S, F>) {
  const { color: _color, registry, type: _type, ...rest } = props;

  return (
    <Button
      icon={<CloseOutlined />}
      title={registry.translateString(TranslatableString.ClearButton)}
      type="link"
      {...rest}
    />
  );
}

/** CopyButton for array items (in-app icon to avoid theme bundle "got object" error). */
export function CopyButton<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: IconButtonProps<T, S, F>) {
  const {
    className,
    color: _color,
    registry,
    style,
    type: _type,
    ...rest
  } = props;

  return (
    <Button
      className={twMerge(arrayItemBtnClass, className)}
      icon={<CopyOutlined />}
      style={{ ...ARRAY_ITEM_BTN_STYLE, ...style }}
      title={registry.translateString(TranslatableString.CopyButton)}
      {...rest}
    />
  );
}

/** MoveDownButton for array items. */
export function MoveDownButton<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: IconButtonProps<T, S, F>) {
  const {
    className,
    color: _color,
    registry,
    style,
    type: _type,
    ...rest
  } = props;

  return (
    <Button
      className={twMerge(arrayItemBtnClass, className)}
      icon={<ArrowDownOutlined />}
      style={{ ...ARRAY_ITEM_BTN_STYLE, ...style }}
      title={registry.translateString(TranslatableString.MoveDownButton)}
      {...rest}
    />
  );
}

/** MoveUpButton for array items. */
export function MoveUpButton<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: IconButtonProps<T, S, F>) {
  const {
    className,
    color: _color,
    registry,
    style,
    type: _type,
    ...rest
  } = props;

  return (
    <Button
      className={twMerge(arrayItemBtnClass, className)}
      icon={<ArrowUpOutlined />}
      style={{ ...ARRAY_ITEM_BTN_STYLE, ...style }}
      title={registry.translateString(TranslatableString.MoveUpButton)}
      {...rest}
    />
  );
}
