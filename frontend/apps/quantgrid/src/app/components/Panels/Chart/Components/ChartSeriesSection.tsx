import { Button, ColorPicker, Tooltip } from 'antd';
import { AggregationColor } from 'antd/es/color-picker/color';
import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Select, { SingleValue } from 'react-select';

import Icon from '@ant-design/icons';
import {
  ChevronDown,
  CloseIcon,
  isNumericType,
  secondaryButtonClasses,
  secondaryDisabledButtonClasses,
  SelectClasses,
  selectStyles,
} from '@frontend/common';
import {
  chartSeriesColorDecoratorName,
  escapeValue,
  ParsedTable,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
  ViewportContext,
} from '../../../../context';
import { useFieldEditDsl } from '../../../../hooks';
import {
  ChartPanelSelectClasses,
  CustomColorOption,
  CustomSingleColorValue,
} from './SelectUtils';
import { SeriesColumnAttributesSection } from './SeriesColumnAttributesSection';

type FieldOption = {
  value: string;
  label: string;
  color: string | undefined;
};

const defaultColor = undefined;

export function ChartSeriesSection({
  parsedTable,
  showSeriesColumnAttributesSection,
  showSeriesSection,
}: {
  parsedTable: ParsedTable;
  showSeriesColumnAttributesSection: boolean;
  showSeriesSection: boolean;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { sheetName } = useContext(ProjectContext);
  const { viewGridData } = useContext(ViewportContext);
  const { setFieldDecorator, removeFieldDecorator } = useFieldEditDsl();
  const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>();
  const [selectedField, setSelectedField] = useState<FieldOption>();
  const selectedFieldRef = useRef<FieldOption>();

  const handleColorSubmit = useCallback(() => {
    if (!selectedField || !sheetName || !selectedColor) return;

    const { tableName } = parsedTable;
    const fieldName = selectedField.value;
    const historyTitle = `Change series color for ${tableName}[${fieldName}]`;
    selectedFieldRef.current = selectedField;
    setFieldDecorator(
      tableName,
      fieldName,
      chartSeriesColorDecoratorName,
      escapeValue(selectedColor),
      historyTitle
    );
    openTable(sheetName, tableName);
  }, [
    openTable,
    parsedTable,
    selectedColor,
    selectedField,
    sheetName,
    setFieldDecorator,
  ]);

  const handleOpenChange = useCallback(() => {
    setColorPickerOpen(!colorPickerOpen);
  }, [colorPickerOpen]);

  const handleApplyColor = useCallback(() => {
    handleColorSubmit();
    setColorPickerOpen(false);
  }, [handleColorSubmit]);

  const handleColorChange = useCallback((color: AggregationColor) => {
    setSelectedColor(color.toHexString());
  }, []);

  const handleChangeField = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      setSelectedField(option as FieldOption);
      setSelectedColor(option?.color || defaultColor);
      selectedFieldRef.current = option as FieldOption;
    },
    []
  );

  const handleRemoveColor = useCallback(
    (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      if (!selectedField || !sheetName) return;

      const { tableName } = parsedTable;
      const fieldName = selectedField.value;
      const historyTitle = `Remove series color for ${tableName}[${fieldName}]`;
      removeFieldDecorator(
        tableName,
        fieldName,
        chartSeriesColorDecoratorName,
        historyTitle
      );
      openTable(sheetName, tableName);
      setSelectedColor(defaultColor);
    },
    [openTable, parsedTable, removeFieldDecorator, selectedField, sheetName]
  );

  useEffect(() => {
    const updatedFieldOptions: FieldOption[] = [];
    const tableData = viewGridData.getTableData(parsedTable.tableName);
    const { types } = tableData;
    const seriesFields = parsedTable.fields
      .filter((f) => {
        const fieldType = types[f.key.fieldName];

        return (
          !(fieldType && !isNumericType(fieldType)) &&
          !f.isChartXAxis() &&
          !f.isChartSelector() &&
          !f.isChartDotColor() &&
          !f.isChartDotSize() &&
          !f.isDynamic
        );
      })
      .sort((a, b) => a.key.fieldName.localeCompare(b.key.fieldName));

    seriesFields.forEach((f) => {
      updatedFieldOptions.push({
        value: f.key.fieldName,
        label: f.key.fieldName,
        color: f.getSeriesColor() || defaultColor,
      });
    });

    setFieldOptions(updatedFieldOptions);

    if (updatedFieldOptions.length > 0) {
      if (selectedFieldRef?.current?.value) {
        const fieldName = selectedFieldRef.current.value;
        const foundSelectedField = updatedFieldOptions.find(
          (f) => f.value === fieldName
        );

        if (foundSelectedField) {
          setSelectedField(foundSelectedField);

          return;
        }
      }

      setSelectedField(updatedFieldOptions[0]);
      setSelectedColor(updatedFieldOptions[0].color);
    }
  }, [parsedTable, viewGridData]);

  return (
    <div className="flex flex-col">
      {showSeriesSection && (
        <div className="w-full flex items-center">
          <Select
            classNames={{
              ...SelectClasses,
              ...ChartPanelSelectClasses,
            }}
            components={{
              IndicatorSeparator: null,
              Option: CustomColorOption,
              SingleValue: CustomSingleColorValue,
            }}
            isSearchable={true}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            name="chartSeries"
            options={fieldOptions}
            styles={selectStyles}
            value={selectedField}
            onChange={handleChangeField}
          />
          <ColorPicker
            className="ml-2 px-1"
            disabledAlpha={true}
            disabledFormat={true}
            open={colorPickerOpen}
            panelRender={(panel) => (
              <div className="flex flex-col">
                {panel}

                <div className="flex justify-between w-full pt-2">
                  <Button
                    className={cx(
                      secondaryButtonClasses,
                      secondaryDisabledButtonClasses,
                      'text-[13px] font-semibold h-5 w-full !rounded-none'
                    )}
                    onClick={handleApplyColor}
                  >
                    Apply color
                  </Button>
                </div>
              </div>
            )}
            showText={() => (
              <div className="flex items-center">
                {selectedColor && (
                  <Tooltip title="Remove series color">
                    <Icon
                      className="w-[18px] text-textPrimary mr-1"
                      component={() => <CloseIcon />}
                      onClick={handleRemoveColor}
                    />
                  </Tooltip>
                )}
                <Icon
                  className={cx('w-[18px] text-textPrimary', {
                    'rotate-180': colorPickerOpen,
                    'rotate-0': !colorPickerOpen,
                  })}
                  component={() => <ChevronDown />}
                />
              </div>
            )}
            value={selectedColor}
            onChangeComplete={handleColorChange}
            onOpenChange={handleOpenChange}
          />
        </div>
      )}

      {showSeriesColumnAttributesSection && (
        <SeriesColumnAttributesSection parsedTable={parsedTable} />
      )}
    </div>
  );
}
