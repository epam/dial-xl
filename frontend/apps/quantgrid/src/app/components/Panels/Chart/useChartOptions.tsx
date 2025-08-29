import { CollapseProps } from 'antd/es/collapse/Collapse';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import { PlusIcon } from '@frontend/common';
import { ChartType, ParsedTable } from '@frontend/parser';

import {
  ChartDataSection,
  ChartOrientationSection,
  ChartPlacementSection,
  ChartSelectorsSection,
  ChartSeriesSection,
  ChartTitleSection,
  ChartTypeSection,
  ChartXAxisSection,
  InfoHeader,
} from './Components';
import {
  chartsWithOrientation,
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

  const chartType = useMemo(() => {
    return parsedTable?.getChartType();
  }, [parsedTable]);

  const showLegendSection = useMemo(() => {
    return chartType ? !chartsWithoutLegend.includes(chartType) : false;
  }, [chartType]);

  const showXAxisSection = useMemo(() => {
    return chartType ? !chartsWithoutXAxis.includes(chartType) : false;
  }, [chartType]);

  const showOrientationSection = useMemo(() => {
    return chartType ? chartsWithOrientation.includes(chartType) : false;
  }, [chartType]);

  const showSeparatorsSection = useMemo(() => {
    return chartType ? chartsWithSeparators.includes(chartType) : false;
  }, [chartType]);

  const onFirstCollapseSectionChange = useCallback((activeKeys: string[]) => {
    setFirstCollapseSectionActiveKeys(activeKeys as CollapseSection[]);
  }, []);

  const showSeriesColumnAttributesSection = useMemo((): boolean => {
    if (chartType === ChartType.SCATTER_PLOT) return true;

    const isHorizontal = parsedTable.getChartOrientation() === 'horizontal';
    const horizontalChartsWithDotColor = [
      ChartType.BAR,
      ChartType.PIE,
      ChartType.FLAT_BAR,
      ChartType.STACKED_BAR,
    ];

    return !!(
      chartType &&
      isHorizontal &&
      horizontalChartsWithDotColor.includes(chartType)
    );
  }, [parsedTable, chartType]);

  const showSeriesSection = useMemo((): boolean => {
    const chartsWithSeriesColor = [
      ChartType.LINE,
      ChartType.PERIOD_SERIES,
      ChartType.HISTOGRAM,
      ChartType.SCATTER_PLOT,
    ];

    if (chartType && chartsWithSeriesColor.includes(chartType)) return true;

    const isVertical = parsedTable.getChartOrientation() === 'vertical';

    const verticalChartsWithDotColor = [
      ChartType.BAR,
      ChartType.PIE,
      ChartType.FLAT_BAR,
      ChartType.STACKED_BAR,
    ];

    return !!(
      chartType &&
      isVertical &&
      verticalChartsWithDotColor.includes(chartType)
    );
  }, [chartType, parsedTable]);

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
    const items: CollapseProps['items'] = [];

    if (showSeriesColumnAttributesSection || showSeriesSection) {
      items.push({
        key: CollapseSection.Series,
        label: 'Series',
        children: (
          <ChartSeriesSection
            parsedTable={parsedTable}
            showSeriesColumnAttributesSection={
              showSeriesColumnAttributesSection
            }
            showSeriesSection={showSeriesSection}
          />
        ),
      });
    }

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

    if (showOrientationSection) {
      items.push({
        key: CollapseSection.Orientation,
        label: 'Data Fields split by',
        children: <ChartOrientationSection parsedTable={parsedTable} />,
      });
    }

    return items;
  }, [
    parsedTable,
    showSeriesColumnAttributesSection,
    showOrientationSection,
    showSeparatorsSection,
    showSeriesSection,
    showXAxisSection,
  ]);

  return {
    getFirstCollapseSection,
    getSecondCollapseSection,
    showLegendSection,
    firstCollapseSectionActiveKeys,
    onFirstCollapseSectionChange,
  };
}
