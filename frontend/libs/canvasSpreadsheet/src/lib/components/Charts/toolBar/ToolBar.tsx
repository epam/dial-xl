import { useCallback } from 'react';

import { getPx } from '../../../utils';
import { ToolBarSelect } from './ToolBarSelect';
import { ToolBarProps } from './types';

export function ToolBar({
  chartConfig,
  isHidden,
  moveMode,
  zoom,
  onLoadMoreKeys,
  onSelectKey,
}: ToolBarProps) {
  const getKeys = useCallback(() => {
    return chartConfig.gridChart.fieldKeys;
  }, [chartConfig.gridChart]);

  const handleLoadMoreKeys = useCallback(
    (tableName: string, fieldName: string) => {
      onLoadMoreKeys(tableName, fieldName);
    },
    [onLoadMoreKeys]
  );

  const handleSelectKey = useCallback(
    (tableName: string, fieldName: string, value: string) => {
      onSelectKey(tableName, fieldName, value);
    },
    [onSelectKey]
  );

  const hasKeys = !!getKeys().length;

  return (
    <div
      className="flex items-center absolute bg-bgGridField border-x-[0.3px] border-x-strokeGridMain"
      key={'toolbar_' + chartConfig.tableName}
      style={{
        left: getPx(chartConfig.toolBarLeft),
        top: getPx(chartConfig.toolBarTop),
        width: getPx(chartConfig.width),
        height: getPx(chartConfig.toolBarHeight),
        display: isHidden ? 'none' : 'flex',
        pointerEvents: moveMode ? 'none' : 'auto',
      }}
    >
      <div className="flex h-full w-full overflow-auto py-0 px-[5px] thin-scrollbar">
        {hasKeys ? (
          getKeys().map((key) => (
            <ToolBarSelect
              chartConfig={chartConfig}
              key={key}
              keyName={key}
              zoom={zoom}
              onLoadMoreKeys={handleLoadMoreKeys}
              onSelectKey={handleSelectKey}
            />
          ))
        ) : (
          <span>There are no keys for the chart</span>
        )}
      </div>
    </div>
  );
}
