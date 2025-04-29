import { DefaultOptionType } from 'rc-select/lib/Select';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Select, { SingleValue } from 'react-select';

import {
  SelectClasses,
  selectStyles,
  toExcelColumnName,
} from '@frontend/common';
import {
  chartDotColorDecoratorName,
  chartDotSizeDecoratorName,
  ParsedField,
  ParsedTable,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
} from '../../../../context';
import { useFieldEditDsl } from '../../../../hooks';
import { uniqueId } from '../../../../services';
import { ChartPanelSelectClasses } from './SelectUtils';

type Section = {
  title: string;
  fields: ParsedField[];
  dotColorValue: { value: string; label: string };
  dotColorOptions: { value: string; label: string; isDisabled: boolean }[];
  dotSizeValue: { value: string; label: string };
  dotSizeOptions: { value: string; label: string; isDisabled: boolean }[];
};

const defaultLabel = 'Not Selected';

export function ScatterPlotSeriesSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { sheetName } = useContext(ProjectContext);
  const { removeFieldDecorator, setFieldDecorator, swapFieldDecorators } =
    useFieldEditDsl();
  const [sections, setSections] = useState<Section[]>([]);

  const defaultValue = useMemo(() => `default_value_${uniqueId()}`, []);

  const handleChangeOption = useCallback(
    (
      section: Section,
      option: SingleValue<DefaultOptionType>,
      decoratorName: string
    ) => {
      if (!sheetName) return;

      const { tableName } = parsedTable;

      if (option === null || option.value === defaultValue) {
        const fieldName =
          decoratorName === chartDotSizeDecoratorName
            ? section.dotSizeValue.value
            : section.dotColorValue.value;
        const historyTitle = `Remove ${decoratorName} from ${tableName}[${fieldName}]`;
        removeFieldDecorator(tableName, fieldName, decoratorName, historyTitle);
      } else if (option.value) {
        const fieldName = option.value as string;
        const historyTitle = `Add ${decoratorName} to ${tableName}[${fieldName}]`;
        const selectedField = section.fields.find((f) => {
          if (decoratorName === chartDotColorDecoratorName) {
            return f.isChartDotColor();
          } else {
            return f.isChartDotSize();
          }
        });
        if (selectedField) {
          swapFieldDecorators(
            tableName,
            selectedField.key.fieldName,
            fieldName,
            decoratorName,
            '',
            historyTitle
          );
        } else {
          setFieldDecorator(
            tableName,
            fieldName,
            decoratorName,
            '',
            historyTitle
          );
        }
      }

      openTable(sheetName, tableName);
    },
    [
      setFieldDecorator,
      defaultValue,
      openTable,
      parsedTable,
      removeFieldDecorator,
      sheetName,
      swapFieldDecorators,
    ]
  );

  useEffect(() => {
    const chartSections: ParsedField[][] =
      parsedTable.getChartSeparatedSections();

    const updatedSections: Section[] = chartSections.map((fields, index) => {
      const dotColorField = fields.find((field) => field.isChartDotColor());
      const dotSizeField = fields.find((field) => field.isChartDotSize());
      let dotColorValue = { value: defaultValue, label: defaultLabel };
      if (dotColorField) {
        const { fieldName } = dotColorField.key;
        dotColorValue = { value: fieldName, label: fieldName };
      }

      let dotSizeValue = { value: defaultValue, label: defaultLabel };

      if (dotSizeField) {
        const { fieldName } = dotSizeField.key;
        dotSizeValue = { value: fieldName, label: fieldName };
      }

      const title = `Group ${toExcelColumnName(index)}`;
      const options = fields
        .map((f) => ({
          value: f.key.fieldName,
          label: f.key.fieldName,
          isDisabled:
            f.isChartXAxis() ||
            f.isChartSelector() ||
            f.isChartDotColor() ||
            f.isChartDotSize(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      options.unshift({
        value: defaultValue,
        label: defaultLabel,
        isDisabled: false,
      });

      return {
        title,
        fields,
        dotSizeValue,
        dotColorValue,
        dotColorOptions: options,
        dotSizeOptions: options,
      };
    });

    setSections(updatedSections);
  }, [defaultValue, parsedTable]);

  return (
    <div className="flex flex-col mt-4">
      {sections.map((section) => {
        return (
          <div className="flex flex-col mb-2" key={section.title}>
            {sections.length > 1 && (
              <div className="text-[12px] text-textSecondary mb-1">
                {section.title}
              </div>
            )}

            <div className="flex items-center mb-2">
              <span className="min-w-[120px] text-[13px] text-textPrimary">
                Dot color
              </span>

              <Select
                classNames={{
                  ...SelectClasses,
                  ...ChartPanelSelectClasses,
                  clearIndicator: () => '!p-0',
                }}
                components={{
                  IndicatorSeparator: null,
                }}
                isClearable={section.dotColorValue.value !== defaultValue}
                isSearchable={true}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                name={`scatterPlotDotColor-${section.title}`}
                options={section.dotColorOptions}
                styles={selectStyles}
                value={section.dotColorValue}
                onChange={(option) =>
                  handleChangeOption(
                    section,
                    option,
                    chartDotColorDecoratorName
                  )
                }
              />
            </div>

            <div className="flex items-center mb-2">
              <span className="min-w-[120px] text-[13px] text-textPrimary">
                Dot size
              </span>

              <Select
                classNames={{
                  ...SelectClasses,
                  ...ChartPanelSelectClasses,
                  clearIndicator: () => '!p-0',
                }}
                components={{
                  IndicatorSeparator: null,
                }}
                isClearable={section.dotSizeValue.value !== defaultValue}
                isSearchable={true}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                name={`scatterPlotDotSize-${section.title}`}
                options={section.dotSizeOptions}
                styles={selectStyles}
                value={section.dotSizeValue}
                onChange={(option) =>
                  handleChangeOption(section, option, chartDotSizeDecoratorName)
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
