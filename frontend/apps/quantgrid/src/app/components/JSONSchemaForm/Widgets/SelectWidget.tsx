import { DefaultOptionType } from 'antd/es/select';
import { useCallback, useMemo } from 'react';
import Select, { FilterOptionOption, SingleValue } from 'react-select';

import { SelectClasses, selectStyles } from '@frontend/common/lib';
import {
  ariaDescribedByIds,
  enumOptionsIndexForValue,
  enumOptionsValueForIndex,
  FormContextType,
  GenericObjectType,
  RJSFSchema,
  StrictRJSFSchema,
  WidgetProps,
} from '@rjsf/utils';

const isString = (val: unknown): val is string => typeof val === 'string';

/** The `SelectWidget` is a widget for rendering dropdowns.
 *  It is typically used with string properties constrained with enum options.
 *
 * @param props - The `WidgetProps` for this component
 */
export function SelectWidget<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any
>({
  autofocus,
  disabled,
  formContext = {} as F,
  id,
  multiple,
  onBlur,
  onChange,
  onFocus,
  options,
  placeholder,
  readonly,
  value,
  schema,
}: WidgetProps<T, S, F>) {
  const { readonlyAsDisabled = true } = formContext as GenericObjectType;

  const { enumOptions, enumDisabled, emptyValue } = options;

  // TODO: support multiselect
  const handleChange = useCallback(
    (nextValue: SingleValue<DefaultOptionType>) => {
      onChange(nextValue?.value?.toString());
    },
    [onChange]
  );

  const handleBlur = () =>
    onBlur(id, enumOptionsValueForIndex<S>(value, enumOptions, emptyValue));

  const handleFocus = () =>
    onFocus(id, enumOptionsValueForIndex<S>(value, enumOptions, emptyValue));

  const filterOption:
    | ((
        option: FilterOptionOption<SingleValue<DefaultOptionType>>,
        inputValue: string
      ) => boolean)
    | null = (option, input) => {
    if (option && isString(option.label)) {
      // labels are strings in this context
      return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
    }

    return false;
  };

  const selectedIndexes = enumOptionsIndexForValue<S>(
    value,
    enumOptions,
    multiple
  );

  // Antd's typescript definitions do not contain the following props that are actually necessary and, if provided,
  // they are used, so hacking them in via by spreading `extraProps` on the component to avoid typescript errors
  const extraProps = {
    name: id,
  };

  const showPlaceholderOption = !multiple && schema.default === undefined;

  const selectOptions: DefaultOptionType[] | undefined = useMemo(() => {
    if (Array.isArray(enumOptions)) {
      const options: DefaultOptionType[] = enumOptions.map(
        ({ value: optionValue, label: optionLabel }, index) => ({
          disabled:
            Array.isArray(enumDisabled) &&
            enumDisabled.indexOf(optionValue) !== -1,
          key: String(index),
          value: String(index),
          label: optionLabel,
        })
      );

      if (showPlaceholderOption) {
        options.unshift({ value: '', label: placeholder || '' });
      }

      return options;
    }

    return undefined;
  }, [enumDisabled, enumOptions, placeholder, showPlaceholderOption]);

  const selectedOptions = useMemo(() => {
    return selectOptions?.filter((_, index) =>
      selectedIndexes?.includes(index.toString())
    );
  }, [selectOptions, selectedIndexes]);

  return (
    <Select
      classNames={SelectClasses}
      components={{
        IndicatorSeparator: null,
      }}
      isSearchable={false}
      styles={selectStyles}
      {...extraProps}
      autoFocus={autofocus}
      id={id}
      isDisabled={disabled || (readonlyAsDisabled && readonly)}
      isMulti={multiple}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      options={selectOptions}
      placeholder={placeholder}
      value={selectedOptions}
      onBlur={!readonly ? handleBlur : undefined}
      onChange={!readonly ? handleChange : undefined}
      onFocus={!readonly ? handleFocus : undefined}
      {...extraProps}
      aria-describedby={ariaDescribedByIds<T>(id)}
      filterOption={filterOption}
    />
  );
}
