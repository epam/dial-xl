import { Tooltip } from 'antd';
import cx from 'classnames';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Icon from '@ant-design/icons';
import { CloseIcon, DotsIcon } from '@frontend/common';
import { unescapeTableName } from '@frontend/parser';

import { getPx, snap } from '../../../utils';
import { ChartConfig } from '../types';

type Props = {
  chartConfig: ChartConfig;
  isHidden: boolean;
  isHovered: boolean;
  isMoving: boolean;
  isSelected: boolean;
  moveMode: boolean;
  zoom: number;
  onSelectChart: () => void;
  onStartMoveChart: (e: React.MouseEvent<HTMLDivElement>) => void;
  onRenameTable: (oldName: string, newName: string) => void;
  onOpenContextMenu: (
    e: React.MouseEvent<any>,
    chartConfig: ChartConfig,
  ) => void;
  onDeleteChart: () => void;
};

export function ChartTitle({
  chartConfig,
  isHidden,
  isHovered,
  isMoving,
  isSelected,
  moveMode,
  zoom,
  onSelectChart,
  onStartMoveChart,
  onRenameTable,
  onOpenContextMenu,
  onDeleteChart,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(chartConfig.tableName || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayedTitle = useMemo(() => {
    return unescapeTableName(chartConfig.tableName);
  }, [chartConfig.tableName]);

  useEffect(() => {
    setEditValue(displayedTitle || '');
  }, [displayedTitle]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (e.button !== 0 || moveMode || isEditing) return;

      onStartMoveChart(e);
    },
    [onStartMoveChart, moveMode, isEditing],
  );

  const onStartRename = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      if (moveMode) return;
      setIsEditing(true);
    },
    [moveMode],
  );

  const handleTextMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
    },
    [],
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== displayedTitle) {
      onRenameTable(chartConfig.tableName, editValue.trim());
    } else {
      setEditValue(chartConfig.tableName || '');
    }
  }, [editValue, displayedTitle, onRenameTable, chartConfig.tableName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        inputRef.current?.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditValue(chartConfig.gridChart.tableName || '');
        setIsEditing(false);
      }
    },
    [chartConfig.gridChart.tableName],
  );

  const handleTitleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      onSelectChart();
    },
    [onSelectChart],
  );

  const bw = snap(zoom);

  return (
    <div
      className={cx(
        'absolute bg-bg-layer-3 flex items-center justify-between px-3 box-border border-solid',
        {
          'bg-transparent': isMoving,
          'z-100': isSelected,
        },
        isSelected
          ? 'border-stroke-accent-primary'
          : 'border-stroke-tertiary-inverted-alpha',
      )}
      style={{
        left: getPx(chartConfig.titleLeft),
        top: getPx(chartConfig.titleTop),
        width: getPx(chartConfig.width),
        height: getPx(chartConfig.titleHeight),
        display: isHidden ? 'none' : 'flex',
        pointerEvents: moveMode ? 'none' : 'auto',
        borderLeftWidth: bw,
        borderRightWidth: bw,
        borderTopWidth: bw,
        borderBottomWidth: 0,
      }}
      onClick={handleTitleClick}
      onMouseDown={handleMouseDown}
    >
      <div className="flex-1 flex items-center justify-center min-w-0">
        {isEditing ? (
          <input
            className="w-full bg-bg-layer-1 text-text-primary px-2 py-1 border border-stroke-accent rounded outline-none text-center"
            ref={inputRef}
            style={{ fontSize: getPx(14 * zoom) }}
            type="text"
            value={editValue}
            onBlur={handleBlur}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <Tooltip
            align={{ offset: [0, 0] }}
            title={`Click to edit: ${chartConfig.tableName}`}
          >
            <div
              className={cx(
                'text-text-primary font-medium truncate cursor-text px-2 py-1 rounded transition-colors text-center max-w-full',
                {
                  'hover:bg-bg-layer-1': isHovered && !moveMode,
                },
              )}
              style={{ fontSize: getPx(14 * zoom) }}
              onClick={onStartRename}
              onMouseDown={handleTextMouseDown}
            >
              {displayedTitle}
            </div>
          </Tooltip>
        )}
      </div>

      <div
        className={cx(
          'absolute right-3 flex items-center justify-center gap-2 transition-opacity duration-200 ease-in-out shrink-0',
          isHovered && !isEditing
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Tooltip title="Context menu">
          <Icon
            className="w-4 text-text-secondary cursor-pointer"
            component={() => <DotsIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onOpenContextMenu?.(e, chartConfig);
            }}
          />
        </Tooltip>
        <Tooltip title="Delete chart">
          <Icon
            className="w-4 text-text-secondary cursor-pointer"
            component={() => <CloseIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteChart?.();
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
}
