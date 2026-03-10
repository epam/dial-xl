import { Collapse } from 'antd';

import { ParsedTable } from '@frontend/parser';

import {
  ChartLegendPositionSection,
  ChartLegendSection,
  ChartShowTitleSection,
  ChartVisualMapSection,
  CollapseIcon,
} from './Components';
import { useChartOptions } from './useChartOptions';

export function ChartOptions({ parsedTable }: { parsedTable: ParsedTable }) {
  const {
    firstCollapseSectionActiveKeys,
    onFirstCollapseSectionChange,
    secondCollapseSectionActiveKeys,
    onSecondCollapseSectionChange,
    getFirstCollapseSection,
    getSecondCollapseSection,
    showLegendSection,
    showVisualMapSection,
  } = useChartOptions({ parsedTable });

  return (
    <>
      <div className="flex items-center justify-between gap-2 py-2">
        <h2 className="text-[13px] text-text-primary font-semibold px-4 py-2">
          Edit Chart: {parsedTable.tableName}
        </h2>
      </div>
      <Collapse
        activeKey={firstCollapseSectionActiveKeys}
        collapsible="header"
        expandIcon={CollapseIcon}
        items={getFirstCollapseSection()}
        onChange={onFirstCollapseSectionChange}
      />

      <ChartShowTitleSection parsedTable={parsedTable} />

      {showVisualMapSection && (
        <ChartVisualMapSection parsedTable={parsedTable} />
      )}
      {showLegendSection && <ChartLegendSection parsedTable={parsedTable} />}
      {showLegendSection && (
        <ChartLegendPositionSection parsedTable={parsedTable} />
      )}

      <Collapse
        activeKey={secondCollapseSectionActiveKeys}
        collapsible="header"
        expandIcon={CollapseIcon}
        items={getSecondCollapseSection()}
        onChange={onSecondCollapseSectionChange}
      />
    </>
  );
}
