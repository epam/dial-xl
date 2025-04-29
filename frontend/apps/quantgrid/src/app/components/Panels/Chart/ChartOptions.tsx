import { Collapse } from 'antd';

import { ParsedTable } from '@frontend/parser';

import { ChartLegendSection, CollapseIcon } from './Components';
import { useChartOptions } from './useChartOptions';

export function ChartOptions({ parsedTable }: { parsedTable: ParsedTable }) {
  const {
    firstCollapseSectionActiveKeys,
    onFirstCollapseSectionChange,
    getFirstCollapseSection,
    getSecondCollapseSection,
    showLegendSection,
  } = useChartOptions({ parsedTable });

  return (
    <>
      <Collapse
        activeKey={firstCollapseSectionActiveKeys}
        collapsible="header"
        expandIcon={CollapseIcon}
        items={getFirstCollapseSection()}
        onChange={onFirstCollapseSectionChange}
      />

      {showLegendSection && <ChartLegendSection parsedTable={parsedTable} />}

      <Collapse
        collapsible="header"
        expandIcon={CollapseIcon}
        items={getSecondCollapseSection()}
      />
    </>
  );
}
