import {
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import Select, {
  ClassNamesConfig,
  GroupBase,
  SingleValue,
  type StylesConfig,
} from 'react-select';

import { chartItems, SelectClasses, selectStyles } from '@frontend/common';
import { ParsedTable } from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
} from '../../../../context';
import { useChartEditDsl } from '../../../../hooks';
import { ChartPanelSelectClasses } from '../ChartPanelSelectClasses';
import {
  CustomSingleValueWithIcon,
  OptionWithIcon,
  OptionWithIconType,
} from './SelectUtils';

type ChartTypeOption = OptionWithIconType & {
  label: string;
  value: (typeof chartItems)[number]['type'];
};

const chartTypeOptions: ChartTypeOption[] = chartItems.map((item) => ({
  ...item,
  value: item.type,
  label: item.label,
}));

export function ChartTypeSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { sheetName } = useContext(ProjectContext);
  const { setChartType: changeChartType } = useChartEditDsl();

  const [chartType, setChartType] = useState(chartTypeOptions[0]);

  const onChangeChartType = useCallback(
    (option: SingleValue<ChartTypeOption>) => {
      if (!sheetName || !parsedTable) return;

      const updatedChartTypeOption =
        chartTypeOptions.find((c) => c.value === option?.value) ||
        chartTypeOptions[0];

      setChartType(updatedChartTypeOption);

      startTransition(() => {
        const { tableName } = parsedTable;

        changeChartType(tableName, updatedChartTypeOption.value);
        openTable(sheetName, tableName);
      });
    },
    [openTable, parsedTable, sheetName, changeChartType],
  );

  useEffect(() => {
    if (!parsedTable) return;

    const chartType = parsedTable.getChartType();

    if (!chartType) return;

    setChartType(
      chartTypeOptions.find((c) => c.value === chartType) ||
        chartTypeOptions[0],
    );
  }, [parsedTable]);

  return (
    <Select<ChartTypeOption, false, GroupBase<ChartTypeOption>>
      classNames={
        {
          ...SelectClasses,
          ...ChartPanelSelectClasses,
        } as ClassNamesConfig<
          ChartTypeOption,
          false,
          GroupBase<ChartTypeOption>
        >
      }
      components={{
        IndicatorSeparator: null,
        Option: OptionWithIcon,
        SingleValue: CustomSingleValueWithIcon,
      }}
      isSearchable={false}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      name="chartType"
      options={chartTypeOptions}
      styles={
        selectStyles as StylesConfig<
          ChartTypeOption,
          boolean,
          GroupBase<ChartTypeOption>
        >
      }
      value={chartType}
      onChange={onChangeChartType}
    />
  );
}
