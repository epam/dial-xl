import {
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import Select, { GroupBase, SingleValue } from 'react-select';

import { SelectClasses, SelectOption, selectStyles } from '@frontend/common';
import { legendPositionDecoratorName, ParsedTable } from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
} from '../../../../context';
import { useTableEditDsl } from '../../../../hooks';
import { ChartPanelSelectClasses } from '../ChartPanelSelectClasses';

const legendPositionOptions = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

export function ChartLegendPositionSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { sheetName } = useContext(ProjectContext);
  const { updateTableDecoratorValue } = useTableEditDsl();

  const [legendPosition, setLegendPosition] = useState(
    legendPositionOptions[1],
  );

  const onChangeLegendPositon = useCallback(
    (option: SingleValue<SelectOption>) => {
      if (!sheetName || !parsedTable) return;

      const updatedOption =
        legendPositionOptions.find((c) => c.value === option?.value) ||
        legendPositionOptions[0];

      setLegendPosition(updatedOption);

      startTransition(() => {
        const { tableName } = parsedTable;
        const message = `Update legend position to ${updatedOption.label} for the chart ${tableName}`;
        const shouldRemove = updatedOption.value === 'bottom';

        updateTableDecoratorValue(
          tableName,
          `"${updatedOption.value}"`,
          legendPositionDecoratorName,
          message,
          shouldRemove,
        );
        openTable(sheetName, tableName);
      });
    },
    [sheetName, parsedTable, updateTableDecoratorValue, openTable],
  );

  useEffect(() => {
    if (!parsedTable) return;

    const legendPosition = parsedTable.getLegendPosition();

    if (!legendPosition) return;

    setLegendPosition(
      legendPositionOptions.find((c) => c.value === legendPosition) ||
        legendPositionOptions[1],
    );
  }, [parsedTable]);

  return (
    <div className="flex items-center mb-2 mx-4">
      <span className="min-w-[120px] text-[13px] text-text-primary font-semibold">
        Legend position
      </span>
      <Select<SelectOption, false, GroupBase<SelectOption>>
        classNames={{
          ...SelectClasses,
          ...ChartPanelSelectClasses,
          clearIndicator: () => 'p-0!',
        }}
        components={{
          IndicatorSeparator: null,
        }}
        isSearchable={false}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        name="legendPosition"
        options={legendPositionOptions}
        styles={selectStyles}
        value={legendPosition}
        onChange={onChangeLegendPositon}
      />
    </div>
  );
}
