import cx from 'classnames';
import { useCallback } from 'react';

import { getPx } from '../../../utils';
import { ToolBarSelect } from './ToolBarSelect';
import { ToolBarProps } from './types';
import { filterSelectorNames } from './utils';

export function ToolBar({
  chartConfig,
  isMoving,
  isHidden,
  moveMode,
  zoom,
  onLoadMoreKeys,
  onSelectKey,
  onSelectChart,
  onStartMoveChart,
}: ToolBarProps) {
  const getSelectorNames = useCallback(
    () => filterSelectorNames(chartConfig.gridChart),
    [chartConfig.gridChart]
  );

  const handleLoadMoreKeys = useCallback(
    (tableName: string, fieldName: string) => {
      onLoadMoreKeys(tableName, fieldName);
    },
    [onLoadMoreKeys]
  );

  const handleSelectKey = useCallback(
    (
      tableName: string,
      fieldName: string,
      value: string | string[],
      isNoDataKey = false
    ) => {
      onSelectKey(tableName, fieldName, value, isNoDataKey);
    },
    [onSelectKey]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (e.button !== 0 || e.target !== e.currentTarget || moveMode) return;

      onStartMoveChart(e);
    },
    [onStartMoveChart, moveMode]
  );

  return (
    <div
      className={cx(
        'flex items-center absolute bg-bg-layer-3 border-x-[0.3px] border-x-stroke-primary',
        {
          'bg-transparent': isMoving,
        }
      )}
      key={'toolbar_' + chartConfig.tableName}
      style={{
        left: getPx(chartConfig.toolBarLeft),
        top: getPx(chartConfig.toolBarTop),
        width: getPx(chartConfig.width),
        height: getPx(chartConfig.toolBarHeight),
        display: isHidden ? 'none' : 'flex',
        pointerEvents: moveMode ? 'none' : 'auto',
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
