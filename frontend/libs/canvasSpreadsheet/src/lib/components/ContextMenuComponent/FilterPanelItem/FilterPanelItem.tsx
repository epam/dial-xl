import { Button, Spin } from 'antd';
import cx from 'classnames';
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Select, { GroupBase, SingleValue } from 'react-select';

import Icon from '@ant-design/icons';
import {
  CheckboxControlIcon,
  DropdownControlIcon,
  FormulaIcon,
  GridFilterType,
  GridListFilter,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  secondaryButtonClasses,
  SelectCompactClasses,
  SelectOption,
  selectStyles,
  ValueIcon,
} from '@frontend/common';
import { FilterOperator, ParsedConditionFilter } from '@frontend/parser';

import { GridCell, SheetControl } from '../../../types';
import { GridEventBus } from '../../../utils';
import { ConditionFilter } from './ConditionFilter';
import {
  numericOperatorOptions,
  textOperatorOptions,
} from './conditionOperatorOptions';
import { DIVIDER_AFTER, DIVIDER_BEFORE } from './constants';
import { CustomFormulaFilter } from './CustomFormulaFilter';
import { FilterPanelModeOption } from './FilterPanelItemModeOption';
import { ListFilter } from './ListFilter';
import { ConditionState, ModeOption } from './types';
import {
  areSelectedValuesEqual,
  type FilterMode,
  getControlOptionValue,
  getInitialConditionState,
  getInitialCustomExpression,
  getInitialMode,
  getInitialSelectedControl,
  getInitialSelectedValues,
  getInitialUnselectedValues,
  isConditionMode,
  isConditionStateEqual,
  isDividerOption,
} from './utils';

const valueModeOption = {
  value: 'value',
  label: 'Value',
  icon: (
    <Icon
      className="text-text-secondary w-4 h-4"
      component={() => <ValueIcon />}
    />
  ),
};

const controlModeOption = {
  value: 'control',
  label: 'Control',
  icon: (
    <Icon
      className="text-text-secondary w-4 h-4"
      component={() => <DropdownControlIcon />}
    />
  ),
};

const customFormulaModeOption = {
  value: 'customFormula',
  label: 'Custom Formula',
  icon: (
    <Icon
      className="text-text-secondary w-4 h-4"
      component={() => <FormulaIcon />}
    />
  ),
};

type Props = {
  tableName: string;
  fieldName: string;
  filters?: ParsedConditionFilter[];
  filterType: GridFilterType;
  eventBus: GridEventBus;
  cell: GridCell | null;
  listFilter: GridListFilter[];
  sheetControls: SheetControl[];
  isNumeric: boolean;
  onClose: () => void;
};

export function FilterPanelItem({
  tableName,
  fieldName,
  filters,
  filterType,
  eventBus,
  cell,
  listFilter,
  sheetControls,
  isNumeric,
  onClose,
}: Props) {
  const [initialDataRequested, setInitialDataRequested] = useState(false);
  const [initialDataProcessed, setInitialDataProcessed] = useState(false);
  const [mode, setMode] = useState<FilterMode>(() =>
    getInitialMode(cell, listFilter, sheetControls, fieldName),
  );
  const [customExpression, setCustomExpression] = useState(() =>
    getInitialCustomExpression(cell, listFilter, sheetControls, fieldName),
  );
  const [selectedValues, setSelectedValues] = useState<string[] | null>(() =>
    getInitialSelectedValues(
      cell,
      listFilter,
      filters,
      sheetControls,
      fieldName,
    ),
  );
  const [unselectedValues, setUnselectedValues] = useState<string[] | null>(
    () =>
      getInitialUnselectedValues(
        cell,
        listFilter,
        filters,
        sheetControls,
        fieldName,
      ),
  );
  const [conditionState, setConditionState] = useState<ConditionState>(() =>
    getInitialConditionState(
      cell,
      listFilter,
      filters,
      sheetControls,
      fieldName,
    ),
  );
  const [selectedControl, setSelectedControl] = useState<SheetControl | null>(
    () => getInitialSelectedControl(cell, sheetControls, fieldName),
  );

  const initialSelectedValues = useMemo(
    () =>
      getInitialSelectedValues(
        cell,
        listFilter,
        filters,
        sheetControls,
        fieldName,
      ),
    [cell, listFilter, filters, sheetControls, fieldName],
  );
  const initialUnselectedValues = useMemo(
    () =>
      getInitialUnselectedValues(
        cell,
        listFilter,
        filters,
        sheetControls,
        fieldName,
      ),
    [cell, listFilter, filters, sheetControls, fieldName],
  );
  const initialConditionState = useMemo(
    () =>
      getInitialConditionState(
        cell,
        listFilter,
        filters,
        sheetControls,
        fieldName,
      ),
    [cell, listFilter, filters, sheetControls, fieldName],
  );
  const initialCustomExpression = useMemo(
    () =>
      getInitialCustomExpression(cell, listFilter, sheetControls, fieldName),
    [cell, listFilter, sheetControls, fieldName],
  );
  const initialSelectedControl = useMemo(
    () => getInitialSelectedControl(cell, sheetControls, fieldName),
    [cell, sheetControls, fieldName],
  );

  const controlOptions = useMemo(
    () =>
      sheetControls
        .filter(
          (control) =>
            control.tableName !== tableName &&
            !control.controlSourcesTables.includes(tableName),
        )
        .map((control) => ({
          value: getControlOptionValue(control),
          label: `${control.fieldName}`,
          control,
          icon: (
            <Icon
              className="text-text-secondary w-4 h-4"
              component={() =>
                control.controlType === 'dropdown' ? (
                  <DropdownControlIcon />
                ) : (
                  <CheckboxControlIcon />
                )
              }
            />
          ),
        })),
    [sheetControls, tableName],
  );

  const isApplyDisabled = useMemo(() => {
    if (mode === 'value') {
      const type = !unselectedValues ? 'selected' : 'unselected';

      return type === 'selected'
        ? !!selectedValues &&
            !!initialSelectedValues &&
            selectedValues.length > 0 &&
            areSelectedValuesEqual(selectedValues, initialSelectedValues)
        : !!unselectedValues &&
            !!initialUnselectedValues &&
            unselectedValues.length > 0 &&
            areSelectedValuesEqual(unselectedValues, initialUnselectedValues);
    }

    if (isConditionMode(mode)) {
      const hasValue = conditionState.expressionValue.trim().length > 0;
      const isBetween = conditionState.operator === FilterOperator.Between;
      const hasSecondary =
        !isBetween || conditionState.secondaryExpressionValue.trim().length > 0;

      return (
        !hasValue ||
        !hasSecondary ||
        isConditionStateEqual(conditionState, initialConditionState)
      );
    }

    if (mode === 'control') {
      const noControl = selectedControl === null;
      const unchanged =
        initialSelectedControl &&
        selectedControl &&
        initialSelectedControl.tableName === selectedControl.tableName &&
        initialSelectedControl.fieldName === selectedControl.fieldName;

      return noControl || !!unchanged;
    }

    const trimmed = customExpression.trim();

    return trimmed.length === 0 || trimmed === initialCustomExpression.trim();
  }, [
    mode,
    customExpression,
    initialCustomExpression,
    unselectedValues,
    selectedValues,
    initialSelectedValues,
    initialUnselectedValues,
    conditionState,
    initialConditionState,
    selectedControl,
    initialSelectedControl,
  ]);

  const filterModeOptions = useMemo((): ModeOption[] => {
    const conditionOps =
      filterType === 'numeric' ? numericOperatorOptions : textOperatorOptions;
    const conditionOptions = conditionOps.map(
      (op) =>
        ({
          value: `condition:${op.value}`,
          label: op.label,
          icon: op.icon,
        }) as ModeOption,
    );

    return [
      valueModeOption,
      { value: DIVIDER_BEFORE, label: '' },
      ...conditionOptions,
      { value: DIVIDER_AFTER, label: '' },
      controlModeOption,
      customFormulaModeOption,
    ] as ModeOption[];
  }, [filterType]);

  const selectedModeOption = useMemo(
    () => filterModeOptions.find((o) => o.value === mode),
    [filterModeOptions, mode],
  );

  const selectedControlOption = useMemo(
    () =>
      selectedControl
        ? {
            value: getControlOptionValue(selectedControl),
            label: `${selectedControl.fieldName}`,
            control: selectedControl,
            icon: (
              <Icon
                className="text-text-secondary w-4 h-4"
                component={() =>
                  selectedControl.controlType === 'dropdown' ? (
                    <DropdownControlIcon />
                  ) : (
                    <CheckboxControlIcon />
                  )
                }
              />
            ),
          }
        : null,
    [selectedControl],
  );

  const onChangeMode = useCallback((option: SingleValue<SelectOption>) => {
    const value = option?.value as FilterMode | undefined;
    if (!value) return;
    setMode(value);
    if (isConditionMode(value)) {
      const operator = value.replace(/^condition:/, '');
      setConditionState((prev) => ({ ...prev, operator }));
    }
  }, []);

  const handleApplyValue = useCallback(() => {
    const type = !unselectedValues ? 'selected' : 'unselected';
    eventBus.emit({
      type: 'filters/list-applied',
      payload: {
        tableName,
        fieldName,
        values:
          type === 'selected'
            ? (selectedValues ?? [])
            : (unselectedValues ?? []),
        type,
        isNumeric,
      },
    });
  }, [
    unselectedValues,
    eventBus,
    tableName,
    fieldName,
    selectedValues,
    isNumeric,
  ]);

  const handleApplyCondition = useCallback(() => {
    const { operator, expressionValue, secondaryExpressionValue } =
      conditionState;

    if (!expressionValue) return;

    const isBetween = operator === FilterOperator.Between;

    if (isBetween && !secondaryExpressionValue) return;

    eventBus.emit({
      type: 'filters/condition-applied',
      payload: {
        tableName,
        fieldName,
        operator,
        value: isBetween
          ? [expressionValue, secondaryExpressionValue]
          : expressionValue,
        filterType,
      },
    });
  }, [eventBus, tableName, fieldName, conditionState, filterType]);

  const handleApplyCustomFormula = useCallback(() => {
    const expression = customExpression.trim();
    eventBus.emit({
      type: 'filters/custom-formula-applied',
      payload: { tableName, fieldName, expression },
    });
  }, [eventBus, tableName, fieldName, customExpression]);

  const handleApplyControl = useCallback(() => {
    if (!selectedControl) return;
    eventBus.emit({
      type: 'filters/control-applied',
      payload: {
        tableName,
        fieldName,
        controlTableName: selectedControl.tableName,
        controlFieldName: selectedControl.fieldName,
        controlType: selectedControl.controlType,
      },
    });
  }, [eventBus, tableName, fieldName, selectedControl]);

  const onApply = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (mode === 'value') {
        handleApplyValue();
      } else if (isConditionMode(mode)) {
        handleApplyCondition();
      } else if (mode === 'control') {
        handleApplyControl();
      } else if (mode === 'customFormula') {
        handleApplyCustomFormula();
      }

      onClose();
    },
    [
      mode,
      onClose,
      handleApplyValue,
      handleApplyCondition,
      handleApplyControl,
      handleApplyCustomFormula,
    ],
  );

  const onClear = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      eventBus.emit({
        type: 'filters/cleared',
        payload: { tableName, fieldName },
      });

      onClose();
    },
    [eventBus, fieldName, tableName, onClose],
  );

  const onControlSelect = useCallback((option: SingleValue<SelectOption>) => {
    const controlOption = option as
      | { value: string; label: string; control: SheetControl }
      | null
      | undefined;
    setSelectedControl(controlOption?.control ?? null);
  }, []);

  // We need to have list updated on opening filter panel
  useEffect(() => {
    eventBus.emit({
      type: 'filters/update-list',
      payload: { tableName, fieldName, searchValue: '', sort: 1 },
    });
    setInitialDataRequested(true);
  }, [eventBus, fieldName, tableName]);

  useEffect(() => {
    if (!initialDataRequested || initialDataProcessed) return;

    setInitialDataProcessed(true);

    const nextMode = getInitialMode(cell, listFilter, sheetControls, fieldName);
    setMode(nextMode);
    setCustomExpression(
      getInitialCustomExpression(cell, listFilter, sheetControls, fieldName),
    );
    setSelectedValues(
      getInitialSelectedValues(
        cell,
        listFilter,
        filters,
        sheetControls,
        fieldName,
      ),
    );
    setUnselectedValues(
      getInitialUnselectedValues(
        cell,
        listFilter,
        filters,
        sheetControls,
        fieldName,
      ),
    );
    setConditionState(
      getInitialConditionState(
        cell,
        listFilter,
        filters,
        sheetControls,
        fieldName,
      ),
    );
    setSelectedControl(
      nextMode === 'control'
        ? getInitialSelectedControl(cell, sheetControls, fieldName)
        : null,
    );
    // Reset when field changes; omit cell/listFilter/filters to avoid reset on parent re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, fieldName, listFilter]);

  return (
    <div
      className="flex flex-col py-2 w-[240px] bg-bg-layer-1 cursor-default px-2"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {!initialDataRequested || !initialDataProcessed ? (
        <div className="flex items-center justify-center min-h-[290px] w-full">
          <Spin />
        </div>
      ) : (
        <>
          <Select<SelectOption, false, GroupBase<SelectOption>>
            classNames={SelectCompactClasses}
            components={{
              IndicatorSeparator: null,
              Option: FilterPanelModeOption,
            }}
            formatOptionLabel={(option) => {
              const typedOption = option as ModeOption;

              if (isDividerOption(typedOption.value)) return null;

              return (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 shrink-0">{typedOption.icon}</span>
                  <span>{typedOption.label}</span>
                </span>
              );
            }}
            isOptionDisabled={(option) =>
              isDividerOption((option as ModeOption).value)
            }
            isSearchable={false}
            menuPortalTarget={document.body}
            options={filterModeOptions}
            styles={selectStyles}
            value={selectedModeOption}
            onChange={onChangeMode}
          />

          {mode === 'value' && (
            <ListFilter
              columnFormat={cell?.field?.format}
              columnType={cell?.field?.type}
              eventBus={eventBus}
              fieldName={fieldName}
              listFilter={listFilter}
              selectedValues={selectedValues}
              tableName={tableName}
              unselectedValues={unselectedValues}
              onChangeSelectedValues={setSelectedValues}
              onChangeUnselectedValues={setUnselectedValues}
            />
          )}

          {isConditionMode(mode) && (
            <div className="mt-2 flex flex-col">
              <ConditionFilter
                cell={cell}
                eventBus={eventBus}
                fieldName={fieldName}
                listFilter={listFilter}
                operator={conditionState.operator}
                tableName={tableName}
                value={conditionState}
                onChange={setConditionState}
              />
            </div>
          )}

          {mode === 'control' && (
            <div className="mt-2">
              <Select<SelectOption, false, GroupBase<SelectOption>>
                classNames={SelectCompactClasses}
                components={{
                  IndicatorSeparator: null,
                  Option: FilterPanelModeOption,
                }}
                formatOptionLabel={(option) => {
                  const o = option as {
                    label?: string;
                    icon?: React.ReactNode;
                  };

                  return (
                    <span className="flex items-center gap-2">
                      {o.icon}
                      <span>{o.label}</span>
                    </span>
                  );
                }}
                isSearchable={false}
                menuPortalTarget={document.body}
                options={controlOptions}
                placeholder="Select control..."
                styles={selectStyles}
                value={selectedControlOption}
                onChange={onControlSelect}
              />
            </div>
          )}

          {mode === 'customFormula' && (
            <CustomFormulaFilter
              value={customExpression}
              onChange={setCustomExpression}
            />
          )}

          <div className="flex items-center mt-2">
            <Button
              className={cx(
                'h-8 px-2 text-[13px] w-16',
                primaryButtonClasses,
                primaryDisabledButtonClasses,
              )}
              disabled={isApplyDisabled}
              onClick={onApply}
            >
              Apply
            </Button>
            <Button
              className={cx(
                'h-8 px-2 text-[13px] w-16 ml-2',
                secondaryButtonClasses,
              )}
              onClick={onClear}
            >
              Clear
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
