import { Collapse } from 'antd';

import { ParsedTable } from '@frontend/parser';

import { ChartLegendSection, CollapseIcon } from './Components';
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

      {showLegendSection && <ChartLegendSection parsedTable={parsedTable} />}

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
