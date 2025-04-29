import { CollapseProps } from 'antd/es/collapse/Collapse';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import { PlusIcon } from '@frontend/common';
import { ParsedTable } from '@frontend/parser';

import {
  ChartDataSection,
  ChartPlacementSection,
  ChartSelectorsSection,
  ChartSeriesSection,
  ChartTitleSection,
  ChartTypeSection,
  ChartXAxisSection,
  InfoHeader,
} from './Components';
import {
  chartsWithoutLegend,
  chartsWithoutXAxis,
  chartsWithSeparators,
  CollapseSection,
} from './utils';

export function useChartOptions({ parsedTable }: { parsedTable: ParsedTable }) {
  const [isAddingSelector, setIsAddingSelector] = useState(false);
  const [firstCollapseSectionActiveKeys, setFirstCollapseSectionActiveKeys] =
    useState<CollapseSection[]>([
      CollapseSection.Title,
      CollapseSection.ChartType,
    ]);

  useEffect(() => {
    setIsAddingSelector(false);
  }, [parsedTable]);

  const showLegendSection = useMemo(() => {
    const chartType = parsedTable?.getChartType();

    return chartType ? !chartsWithoutLegend.includes(chartType) : false;
  }, [parsedTable]);

  const showXAxisSection = useMemo(() => {
    const chartType = parsedTable?.getChartType();

    return chartType ? !chartsWithoutXAxis.includes(chartType) : false;
  }, [parsedTable]);

  const showSeparatorsSection = useMemo(() => {
    const chartType = parsedTable?.getChartType();

    return chartType ? chartsWithSeparators.includes(chartType) : false;
  }, [parsedTable]);

  const onFirstCollapseSectionChange = useCallback((activeKeys: string[]) => {
    setFirstCollapseSectionActiveKeys(activeKeys as CollapseSection[]);
  }, []);

  useEffect(() => {
    if (isAddingSelector) {
      setFirstCollapseSectionActiveKeys((prev) => [
        ...prev,
        CollapseSection.Selectors,
      ]);
    }
  }, [isAddingSelector]);

  const getFirstCollapseSection = useCallback((): CollapseProps['items'] => {
    return [
      {
        key: CollapseSection.Title,
        label: 'Title',
        children: <ChartTitleSection tableName={parsedTable.tableName} />,
      },
      {
        key: CollapseSection.ChartType,
        label: 'Chart type',
        children: <ChartTypeSection parsedTable={parsedTable} />,
      },
      {
        key: CollapseSection.Selectors,
        label: 'Selectors',
        children: (
          <ChartSelectorsSection
            isAddingSelector={isAddingSelector}
            parsedTable={parsedTable}
            onRemoveNewSelector={() => setIsAddingSelector(false)}
          />
        ),
        extra: (
          <button
            className="flex items-center text-[13px] font-semibold text-textAccentPrimary hover:bg-bgAccentPrimaryAlpha"
            onClick={() => setIsAddingSelector(true)}
          >
            <Icon
              className="w-[18px] text-textAccentPrimary mr-2"
              component={() => <PlusIcon />}
            />
            <span className="text-[13px] leading-[14px]">Add</span>
          </button>
        ),
      },
      {
        key: CollapseSection.SizeLocation,
        label: 'Size and Location',
        children: <ChartPlacementSection parsedTable={parsedTable} />,
      },
    ];
  }, [isAddingSelector, parsedTable]);

  const getSecondCollapseSection = useCallback((): CollapseProps['items'] => {
    const items: CollapseProps['items'] = [
      {
        key: CollapseSection.Series,
        label: 'Series',
        children: <ChartSeriesSection parsedTable={parsedTable} />,
      },
    ];

    if (showSeparatorsSection) {
      items.push({
        key: CollapseSection.Data,
        label: (
          <InfoHeader
            info="Separator could be put between the columns, separating columns in group. That allows to have different x-axis value in every column group."
            title="Data"
          />
        ),
        children: <ChartDataSection parsedTable={parsedTable} />,
      });
    }

    if (showXAxisSection) {
      items.push({
        key: CollapseSection.XAxis,
        label: 'Horizontal axis',
        children: <ChartXAxisSection parsedTable={parsedTable} />,
      });
    }

    return items;
  }, [parsedTable, showSeparatorsSection, showXAxisSection]);

  return {
    getFirstCollapseSection,
    getSecondCollapseSection,
    showLegendSection,
    firstCollapseSectionActiveKeys,
    onFirstCollapseSectionChange,
  };
}
