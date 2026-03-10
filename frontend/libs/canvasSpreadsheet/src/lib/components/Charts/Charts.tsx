import cx from 'classnames';
import { useContext, useEffect, useRef, useState } from 'react';

import { GridStateContext } from '../../context';
import { GridTable } from '../../types';
import { getPx, snap } from '../../utils';
import { Chart } from './Chart';
import { ChartActions } from './chartActions';
import { ChartTitle } from './chartTitle';
import { useChartInteractions, useChartsLayer, useHideCharts } from './hooks';
import { ResizeHandler } from './resizeHandler';
import { ToolBar } from './toolBar';
import { Props } from './types';

export function Charts({
  chartData = {},
  charts = [],
  theme,
  tableStructure,
  eventBus,
}: Props) {
  const { setHasCharts, zoom, selectedTable, columnSizes } =
    useContext(GridStateContext);
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const [resizingChart, setResizingChart] = useState<string | null>(null);
  const { chartConfigs, viewportRef, containerRef } = useChartsLayer({
    charts,
    columnSizes,
  });

  const { hiddenCharts } = useHideCharts(chartConfigs);

  const tableStructureRef = useRef<GridTable[]>([]);
  useEffect(() => {
    tableStructureRef.current = tableStructure;
  }, [tableStructure]);

  const {
    moveMode,
    moveEntity,
    selectedChartName,
    handleChartResize,
    onLoadMoreKeys,
    onSelectKey,
    onSelectChart,
    handleStartMoveChart,
    onChartDblClick,
    handleContextMenu,
    handleDeleteChart,
    handleTableRename,
  } = useChartInteractions({
    eventBus,
    tableStructure,
  });

  useEffect(() => {
    if (chartConfigs.length === 0) {
      setHasCharts(false);
    }

    if (chartConfigs.some((c) => !hiddenCharts.includes(c.tableName))) {
      setHasCharts(true);
    } else {
      setHasCharts(false);
    }
  }, [chartConfigs, hiddenCharts, setHasCharts]);

  return (
    <div
      className={cx(
        'block fixed left-0 top-0 box-border pointer-events-none overflow-hidden bg-transparent z-103',
        { 'opacity-50': moveEntity },
      )}
      ref={viewportRef}
    >
      <div className="relative" id="chartsContainer" ref={containerRef}>
        {chartConfigs.map((chartConfig) => {
          const isHovered = hoveredChart === chartConfig.tableName;
          const isResizingThis = resizingChart === chartConfig.tableName;
          const resizeVisible = isHovered || isResizingThis;
          const isSelected = selectedChartName === chartConfig.tableName;
          const hasHeader = chartConfig.showTitle || chartConfig.showToolbar;
          const bw = snap(zoom);

          return (
            <div
              key={chartConfig.tableName}
              onContextMenu={(e) => handleContextMenu(e, chartConfig)}
              onMouseEnter={() => setHoveredChart(chartConfig.tableName)}
              onMouseLeave={() => setHoveredChart(null)}
            >
              {chartConfig.showTitle && (
                <div>
                  <ChartTitle
                    chartConfig={chartConfig}
                    isHidden={hiddenCharts.includes(chartConfig.tableName)}
                    isHovered={isHovered}
                    isMoving={selectedTable === chartConfig.tableName}
                    isSelected={selectedChartName === chartConfig.tableName}
                    moveMode={moveMode}
                    zoom={zoom}
                    onDeleteChart={() =>
                      handleDeleteChart(chartConfig.tableName)
                    }
                    onOpenContextMenu={handleContextMenu}
                    onRenameTable={handleTableRename}
                    onSelectChart={() => onSelectChart(chartConfig.tableName)}
                    onStartMoveChart={handleStartMoveChart}
                  />
                </div>
              )}

              {chartConfig.showToolbar && (
                <div>
                  <ToolBar
                    chartConfig={chartConfig}
                    isHidden={hiddenCharts.includes(chartConfig.tableName)}
                    isMoving={selectedTable === chartConfig.tableName}
                    isSelected={selectedChartName === chartConfig.tableName}
                    moveMode={moveMode}
                    zoom={zoom}
                    onLoadMoreKeys={onLoadMoreKeys}
                    onSelectChart={() => onSelectChart(chartConfig.tableName)}
                    onSelectKey={onSelectKey}
                    onStartMoveChart={handleStartMoveChart}
                  />
                </div>
              )}

              <div
                className={cx(
                  'absolute bg-bg-layer-3 box-border border-solid',
                  {
                    'bg-transparent': selectedTable === chartConfig.tableName,
                    'z-100': selectedChartName === chartConfig.tableName,
                  },
                  isSelected
                    ? 'border-stroke-accent-primary'
                    : 'border-stroke-tertiary-inverted-alpha',
                )}
                data-chart-type={chartConfig.gridChart.chartType}
                style={{
                  left: getPx(chartConfig.left),
                  top: getPx(chartConfig.top),
                  width: getPx(chartConfig.width),
                  height: getPx(chartConfig.height),
                  borderLeftWidth: bw,
                  borderRightWidth: bw,
                  borderBottomWidth: bw,
                  borderTopWidth: hasHeader ? 0 : bw,
                  display: hiddenCharts.includes(chartConfig.tableName)
                    ? 'none'
                    : 'block',
                  pointerEvents: moveEntity ? 'none' : 'auto',
                }}
              >
                <Chart
                  chartData={chartData}
                  gridChart={chartConfig.gridChart}
                  height={chartConfig.height}
                  theme={theme}
                  width={chartConfig.width}
                  zoom={zoom}
                  onChartDblClick={onChartDblClick}
                  onEchartsMouseDown={handleStartMoveChart}
                  onSelectChart={() => onSelectChart(chartConfig.tableName)}
                />
              </div>

              <ResizeHandler
                chartConfig={chartConfig}
                isSelected={selectedChartName === chartConfig.tableName}
                visible={resizeVisible}
                onChartResize={(cols, rows) => {
                  handleChartResize(chartConfig.tableName, cols, rows);
                }}
                onStartResizing={() => setResizingChart(chartConfig.tableName)}
                onStopResizing={() => setResizingChart(null)}
              />

              {!chartConfig.showTitle && (
                <ChartActions
                  chartConfig={chartConfig}
                  visible={isHovered}
                  onDeleteChart={() => handleDeleteChart(chartConfig.tableName)}
                  onOpenContextMenu={handleContextMenu}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
