import { Button, Input, Popover, Tooltip } from 'antd';
import cx from 'classnames';
import { useCallback, useContext, useEffect, useState } from 'react';

import Icon from '@ant-design/icons';
import { Edges, SelectionEdges } from '@frontend/canvas-spreadsheet';
import {
  EditIcon,
  inputClasses,
  parseExcelRange,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { ExcelPreviewCanvasContext } from '../ExcelPreviewCanvasContext';
import { formatSelectionA1 } from '../utils';

type Props = {
  selection: Edges | null;
  onSelectionChanged: (s: SelectionEdges | null) => void;
  onRangeEditorOpenChange?: (open: boolean) => void;
};

export function RangeEditorPopover({
  selection,
  onSelectionChanged,
  onRangeEditorOpenChange,
}: Props) {
  const gridApiRef = useContext(ExcelPreviewCanvasContext);

  const [rangeEditorOpen, setRangeEditorOpen] = useState(false);
  const [rangeDraft, setRangeDraft] = useState('');
  const [rangeError, setRangeError] = useState<string | null>(null);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setRangeEditorOpen(open);
      onRangeEditorOpenChange?.(open);
    },
    [onRangeEditorOpenChange],
  );

  const applyRange = useCallback(() => {
    const parsed = parseExcelRange(rangeDraft);
    if (!parsed) {
      setRangeError('Invalid range. Examples: A1:D100, B2:B200');

      return;
    }

    setRangeError(null);

    onSelectionChanged(parsed);

    const api = gridApiRef.current;
    api?.updateSelection(parsed);
    api?.moveViewportToCell(parsed.startCol, parsed.startRow);

    handleOpenChange(false);
  }, [gridApiRef, onSelectionChanged, handleOpenChange, rangeDraft]);

  useEffect(() => {
    if (!rangeEditorOpen) return;
    setRangeError(null);
    setRangeDraft(selection ? formatSelectionA1(selection) : '');
  }, [rangeEditorOpen, selection]);

  return (
    <Popover
      content={
        <div className="w-[320px] p-2">
          <div className="text-[13px] font-medium text-text-primary mb-2">
            Enter range
          </div>

          <Input
            className={cx('text-[13px] h-7', inputClasses)}
            name="range-editor-input"
            placeholder="e.g. A1:D100"
            value={rangeDraft}
            onChange={(e) => setRangeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyRange();
              if (e.key === 'Escape') handleOpenChange(false);
            }}
          />

          {rangeError ? (
            <div className="mt-2 text-[11px] text-text-error">{rangeError}</div>
          ) : (
            <div className="mt-2 text-[11px] text-text-secondary">
              Examples: A1:D100, B2:B200
            </div>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <Button
              className={cx(secondaryButtonClasses, 'h-7')}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className={cx(primaryButtonClasses, 'h-7')}
              onClick={applyRange}
            >
              Apply
            </Button>
          </div>
        </div>
      }
      open={rangeEditorOpen}
      placement="bottomLeft"
      trigger="click"
      onOpenChange={handleOpenChange}
    >
      <Tooltip placement="top" title="Enter range">
        <Icon
          className="w-4.5 ml-2 cursor-pointer text-text-secondary"
          component={() => <EditIcon />}
        />
      </Tooltip>
    </Popover>
  );
}
