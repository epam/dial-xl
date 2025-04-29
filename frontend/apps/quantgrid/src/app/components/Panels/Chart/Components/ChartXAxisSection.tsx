import { DefaultOptionType } from 'rc-select/lib/Select';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Select, { SingleValue } from 'react-select';

import {
  SelectClasses,
  selectStyles,
  toExcelColumnName,
} from '@frontend/common';
import {
  chartXAxisDecoratorName,
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
  value: { value: string; label: string };
  options: { value: string; label: string; isDisabled: boolean }[];
};

const defaultLabel = 'Not Selected';

export function ChartXAxisSection({
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

  const handleChangeXAxis = useCallback(
    (section: Section, option: SingleValue<DefaultOptionType>) => {
      if (!sheetName) return;

      const { tableName } = parsedTable;

      if (option === null || option.value === defaultValue) {
        const fieldName = section.value.value;
        const historyTitle = `Remove x-axis from ${tableName}[${fieldName}]`;
        removeFieldDecorator(
          tableName,
          fieldName,
          chartXAxisDecoratorName,
          historyTitle
        );
      } else if (option.value) {
        const { fields } = section;
        const fieldName = option.value as string;
        const historyTitle = `Change x-axis to ${tableName}[${fieldName}]`;
        const fieldWithXAxis = fields.find((field) => field.isChartXAxis());

        if (fieldWithXAxis) {
          swapFieldDecorators(
            tableName,
            fieldWithXAxis.key.fieldName,
            fieldName,
            chartXAxisDecoratorName,
            '',
            historyTitle
          );
        } else {
          setFieldDecorator(
            tableName,
            fieldName,
            chartXAxisDecoratorName,
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
      const xAxisField = fields.find((field) => field.isChartXAxis());
      let value = { value: defaultValue, label: defaultLabel };
      if (xAxisField) {
        const { fieldName } = xAxisField.key;
        value = { value: fieldName, label: fieldName };
      }

      const title = `Group ${toExcelColumnName(index)}`;
      const options = fields
        .filter((f) => !f.isDynamic)
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

      return { title, fields, value, options };
    });

    setSections(updatedSections);
  }, [defaultValue, parsedTable]);

  return (
    <div className="flex flex-col">
      {sections.map((section) => {
        return (
          <div className="flex flex-col mb-2" key={section.title}>
            {sections.length > 1 && (
              <div className="text-[12px] text-textSecondary mb-1">
                {section.title}
              </div>
            )}

            <Select
              classNames={{
                ...SelectClasses,
                ...ChartPanelSelectClasses,
                clearIndicator: () => '!p-0',
              }}
              components={{
                IndicatorSeparator: null,
              }}
              isClearable={section.value.value !== defaultValue}
              isSearchable={true}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              name={`xAxis-${section.title}`}
              options={section.options}
              styles={selectStyles}
              value={section.value}
              onChange={(option) => handleChangeXAxis(section, option)}
            />
          </div>
        );
      })}
    </div>
  );
}
