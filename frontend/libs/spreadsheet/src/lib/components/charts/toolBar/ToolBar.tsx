import React, { useCallback } from 'react';

import { getPx } from '../../../utils';
import styles from './ToolBar.module.scss';
import { ToolBarSelect } from './ToolBarSelect';
import { ToolBarProps } from './types';

export function ToolBar({
  chartConfig,
  charts,
  chartKeys,
  isHidden,
  moveMode,
  zoom,
  onLoadMoreKeys,
  onSelectKey,
}: ToolBarProps) {
  const getKeys = useCallback(
    (tableName: string) => {
      return charts?.find((c) => c.tableName === tableName)?.keys || [];
    },
    [charts]
  );

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

  return (
    <div
      className={styles.chartToolBar}
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
      <div className={styles.toolBarWrapper}>
        {getKeys(chartConfig.tableName).length === 0 && (
          <span>There are no keys for the chart</span>
        )}
        {getKeys(chartConfig.tableName).map((key) => (
          <ToolBarSelect
            chartConfig={chartConfig}
            chartKeys={{ ...chartKeys[chartConfig.tableName]?.chunks } || null}
            charts={charts}
            key={key}
            keyName={key}
            zoom={zoom}
            onLoadMoreKeys={handleLoadMoreKeys}
            onSelectKey={handleSelectKey}
          />
        ))}
      </div>
    </div>
  );
}
