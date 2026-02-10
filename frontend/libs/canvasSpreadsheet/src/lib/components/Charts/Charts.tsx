import cx from 'classnames';
import { useEffect, useRef, useState } from 'react';

import { GridTable } from '../../types';
import { getPx } from '../../utils';
import { Chart } from './Chart';
import { ChartActions } from './chartActions';
import { ChartTitle } from './chartTitle';
import { useChartInteractions, useChartsLayer, useHideCharts } from './hooks';
import { ResizeHandler } from './resizeHandler';
import { ToolBar } from './toolBar';
import { Props } from './types';

export function Charts({
  api,
  chartData = {},
  charts = [],
  zoom = 1,
  theme,
  columnSizes,
  tableStructure,
  eventBus,
}: Props) {
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const [resizingChart, setResizingChart] = useState<string | null>(null);

  const { chartConfigs, viewportRef, containerRef } = useChartsLayer({
    api,
    charts,
    zoom,
    columnSizes,
  });

  const { hiddenCharts } = useHideCharts(api, chartConfigs);

  const tableStructureRef = useRef<GridTable[]>([]);
  useEffect(() => {
    tableStructureRef.current = tableStructure;
  }, [tableStructure]);

  const {
    moveMode,
    moveEntity,
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
    api,
    eventBus,
    tableStructure: tableStructureRef.current,
  });

  useEffect(() => {
    if (!api) return;

    if (chartConfigs.length === 0) {
      api.setHasCharts(false);
    }

    if (chartConfigs.some((c) => !hiddenCharts.includes(c.tableName))) {
      api.setHasCharts(true);
    } else {
      api.setHasCharts(false);
    }
  }, [chartConfigs, hiddenCharts, api]);

  return (
    <div
      className={cx(
        'block fixed left-0 top-0 box-border pointer-events-none overflow-hidden bg-transparent z-103',
        { 'opacity-50': moveEntity }
      )}
      ref={viewportRef}
    >
      <div className="relative" id="chartsContainer" ref={containerRef}>
        {chartConfigs.map((chartConfig) => {
          const isHovered = hoveredChart === chartConfig.tableName;
          const isResizingThis = resizingChart === chartConfig.tableName;
          const resizeVisible = isHovered || isResizingThis;

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
                    isMoving={api?.selectedTable === chartConfig.tableName}
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
                    isMoving={api?.selectedTable === chartConfig.tableName}
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
                  'absolute border-[0.3px] border-stroke-primary bg-bg-layer-3',
                  {
                    'bg-transparent':
                      api?.selectedTable === chartConfig.tableName,
                    'border-t-0':
                      chartConfig.showTitle || chartConfig.showToolbar,
                  }
                )}
                key={chartConfig.tableName}
                style={{
                  left: getPx(chartConfig.left),
                  top: getPx(chartConfig.top),
                  width: getPx(chartConfig.width),
                  height: getPx(chartConfig.height),
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
                api={api}
                chartConfig={chartConfig}
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
