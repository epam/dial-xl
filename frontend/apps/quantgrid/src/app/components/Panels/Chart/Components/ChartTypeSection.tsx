import { DefaultOptionType } from 'rc-select/lib/Select';
import {
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import Select, { SingleValue } from 'react-select';

import { chartItems, SelectClasses, selectStyles } from '@frontend/common';
import {
  escapeValue,
  ParsedTable,
  visualizationDecoratorName,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
} from '../../../../context';
import { useTableEditDsl } from '../../../../hooks';
import {
  ChartPanelSelectClasses,
  CustomSingleValueWithIcon,
  OptionWithIcon,
} from './SelectUtils';

const chartTypeOptions = chartItems.map((item) => ({
  ...item,
  value: item.type,
}));

export function ChartTypeSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { sheetName } = useContext(ProjectContext);
  const { updateTableDecoratorValue } = useTableEditDsl();

  const [chartType, setChartType] = useState(chartTypeOptions[0]);

  const onChangeChartType = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      if (!sheetName || !parsedTable) return;

      const updatedChartTypeOption =
        chartTypeOptions.find((c) => c.value === option?.value) ||
        chartTypeOptions[0];

      setChartType(updatedChartTypeOption);

      startTransition(() => {
        const { tableName } = parsedTable;
        const historyTitle = `Change chart ${tableName} type to ${updatedChartTypeOption.value}`;
        updateTableDecoratorValue(
          tableName,
          escapeValue(updatedChartTypeOption.value),
          visualizationDecoratorName,
          historyTitle
        );
        openTable(sheetName, tableName);
      });
    },
    [openTable, parsedTable, sheetName, updateTableDecoratorValue]
  );

  useEffect(() => {
    if (!parsedTable) return;

    const chartType = parsedTable.getChartType();

    if (!chartType) return;

    setChartType(
      chartTypeOptions.find((c) => c.value === chartType) || chartTypeOptions[0]
    );
  }, [parsedTable]);

  return (
    <Select
      classNames={{
        ...SelectClasses,
        ...ChartPanelSelectClasses,
      }}
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
      styles={selectStyles}
      value={chartType}
      onChange={onChangeChartType}
    />
  );
}
