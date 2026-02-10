import cx from 'classnames';
import { useCallback } from 'react';

import { getPx, snap } from '../../../utils';
import { ToolBarSelect } from './ToolBarSelect';
import { ToolBarProps } from './types';
import { filterSelectorNames } from './utils';

export function ToolBar({
  chartConfig,
  isMoving,
  isHidden,
  isSelected,
  moveMode,
  zoom,
  onLoadMoreKeys,
  onSelectKey,
  onSelectChart,
  onStartMoveChart,
}: ToolBarProps) {
  const getSelectorNames = useCallback(
    () => filterSelectorNames(chartConfig.gridChart),
    [chartConfig.gridChart],
  );

  const handleLoadMoreKeys = useCallback(
    (tableName: string, fieldName: string) => {
      onLoadMoreKeys(tableName, fieldName);
    },
    [onLoadMoreKeys],
  );

  const handleSelectKey = useCallback(
    (
      tableName: string,
      fieldName: string,
      value: string | string[],
      isNoDataKey = false,
    ) => {
      onSelectKey(tableName, fieldName, value, isNoDataKey);
    },
    [onSelectKey],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (e.button !== 0 || e.target !== e.currentTarget || moveMode) return;

      onStartMoveChart(e);
    },
    [onStartMoveChart, moveMode],
  );

  const bw = snap(zoom);
  const showTopBorder = !chartConfig.showTitle;

  return (
    <div
      className={cx(
        'flex items-center absolute bg-bg-layer-3 box-border border-solid',
        {
          'bg-transparent': isMoving,
          'z-100': isSelected,
        },
        isSelected
          ? 'border-stroke-accent-primary'
          : 'border-stroke-tertiary-inverted-alpha',
      )}
      key={'toolbar_' + chartConfig.tableName}
      style={{
        left: getPx(chartConfig.toolBarLeft),
        top: getPx(chartConfig.toolBarTop),
        width: getPx(chartConfig.width),
        height: getPx(chartConfig.toolBarHeight),
        display: isHidden ? 'none' : 'flex',
        pointerEvents: moveMode ? 'none' : 'auto',
        borderLeftWidth: bw,
        borderRightWidth: bw,
        borderTopWidth: showTopBorder ? bw : 0,
        borderBottomWidth: 0,
      }}
      onClick={onSelectChart}
      onMouseDown={handleMouseDown}
    >
      <div
        className="flex h-full w-full overflow-auto py-0 px-[5px] thin-scrollbar"
        onMouseDown={handleMouseDown}
      >
        {getSelectorNames().map((selectorName) => (
          <ToolBarSelect
            chartConfig={chartConfig}
            key={selectorName}
            keyName={selectorName}
            zoom={zoom}
            onLoadMoreKeys={handleLoadMoreKeys}
            onSelectKey={handleSelectKey}
          />
        ))}
      </div>
    </div>
  );
}
