import { Checkbox, Tooltip } from 'antd';
import cx from 'classnames';
import { useCallback, useContext, useMemo } from 'react';

import Icon from '@ant-design/icons';
import { Edges, SelectionEdges } from '@frontend/canvas-spreadsheet';
import { ClearIcon } from '@frontend/common';

import { ExcelPreviewCanvasContext } from '../ExcelPreviewCanvasContext';
import { ExcelTarget, formatSelectionA1 } from '../utils';
import { RangeEditorPopover } from './RangeEditorPopover';

type Props = {
  target: ExcelTarget;
  selection: Edges | null;
  withHeaders: boolean;
  setWithHeaders: (withHeaders: boolean) => void;
  onOpenSidebar?: () => void;
  onSelectionChanged: (s: SelectionEdges | null) => void;
  onRangeEditorOpenChange?: (open: boolean) => void;
};

export function ExcelPreviewGridHeader({
  target,
  selection,
  withHeaders,
  setWithHeaders,
  onOpenSidebar,
  onSelectionChanged,
  onRangeEditorOpenChange,
}: Props) {
  const isSheet = useMemo(() => target?.kind === 'sheet', [target]);
  const gridApiRef = useContext(ExcelPreviewCanvasContext);

  const clearSelection = useCallback(() => {
    onSelectionChanged(null);
    const api = gridApiRef.current;
    api?.clearSelection?.();
  }, [gridApiRef, onSelectionChanged]);

  if (!target) {
    return (
      <div className="px-3 py-2 border-b border-stroke-primary">
        <div className="flex flex-wrap items-center gap-3">
          {onOpenSidebar && (
            <button
              className="lg:hidden inline-flex items-center h-6 px-2 rounded-[3px] text-[12px] border border-stroke-primary bg-bg-layer-3 text-text-secondary"
              type="button"
              onClick={onOpenSidebar}
            >
              Browse
            </button>
          )}

          <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-[12px] bg-bg-layer-4 text-text-secondary border border-stroke-primary h-6 leading-none">
            No sheet/table
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-b border-stroke-primary">
      <div className="flex flex-wrap items-center gap-3">
        {onOpenSidebar && (
          <button
            className="lg:hidden inline-flex items-center h-6 px-2 rounded-[3px] text-[12px] border border-stroke-primary bg-bg-layer-3 text-text-secondary"
            type="button"
            onClick={onOpenSidebar}
          >
            Browse
          </button>
        )}

        <span className="inline-flex items-center h-6 leading-none text-[13px] text-text-secondary">
          Selected:
        </span>

        <span
          className={cx(
            'inline-flex items-center px-2 py-0.5 rounded-[3px] text-[12px] border h-6 leading-none',
            isSheet
              ? 'bg-bg-accent-tertiary-alpha text-text-accent-tertiary border-stroke-accent-tertiary'
              : 'bg-bg-accent-primary-alpha text-text-accent-primary border-stroke-accent-primary',
          )}
        >
          {isSheet ? `Sheet: ${target.name}` : `Table: ${target.name}`}
        </span>

        {isSheet && (
          <>
            <div
              className={cx(
                'inline-flex items-center px-2 py-0.5 rounded-[3px] text-[12px] border h-6 leading-none',
                {
                  'bg-bg-accent-primary-alpha text-text-accent-primary border-stroke-accent-primary':
                    selection,
                },
              )}
            >
              Range:&nbsp;
              <span className="min-w-12">{formatSelectionA1(selection)}</span>
              <RangeEditorPopover
                selection={selection}
                onRangeEditorOpenChange={onRangeEditorOpenChange}
                onSelectionChanged={onSelectionChanged}
              />
              {selection && (
                <Tooltip placement="top" title="Clear selection">
                  <Icon
                    className="w-4.5 ml-2 cursor-pointer text-text-secondary"
                    component={() => <ClearIcon />}
                    onClick={clearSelection}
                  />
                </Tooltip>
              )}
            </div>

            <Checkbox
              checked={withHeaders}
              className="flex items-center h-6"
              rootClassName="dial-xl-checkbox"
              onChange={(e) => setWithHeaders(e.target.checked)}
            >
              With headers
            </Checkbox>
          </>
        )}
      </div>
    </div>
  );
}
