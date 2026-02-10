import { Tooltip } from 'antd';
import cx from 'classnames';
import { MutableRefObject, useCallback, useState } from 'react';

import { getPx } from '../../utils';
import { CellEditorModes, GridCellEditorMode } from './types';
import { getCellEditorColor } from './utils';

type Props = {
  editMode: GridCellEditorMode;
  bottomOffset: string;
  zoom: number;
  mouseOverSwitcherTooltip: MutableRefObject<boolean>;
  onSecondaryEditModeSwitch: () => void;
  onCloseTooltip: () => void;
};

export function CellEditorTooltip({
  editMode,
  bottomOffset,
  zoom,
  onSecondaryEditModeSwitch,
  mouseOverSwitcherTooltip,
  onCloseTooltip,
}: Props) {
  const [tooltipVisible, setTooltipVisible] = useState(true);

  const onMouseOver = useCallback(() => {
    mouseOverSwitcherTooltip.current = true;
  }, [mouseOverSwitcherTooltip]);

  const onMouseLeave = useCallback(() => {
    mouseOverSwitcherTooltip.current = false;
  }, [mouseOverSwitcherTooltip]);

  if (!editMode) return;

  return (
    <div
      className={cx(
        'absolute border border-b-0 rounded-t-[4px] pl-2 ml-[-2px] mb-px whitespace-nowrap',
        getCellEditorColor(editMode, true)
      )}
      style={{
        bottom: bottomOffset,
        display: tooltipVisible ? 'flex' : 'none',
      }}
    >
      <span
        className="text-[11px] font-semibold text-text-inverted select-none"
        style={{ fontSize: getPx(11 * zoom) }}
      >
        <span>{CellEditorModes[editMode].title} </span>
        {CellEditorModes[editMode].subTitle && (
          <span
            className="italic font-normal text-text-inverted cursor-pointer select-none"
            onClick={() => {
              onSecondaryEditModeSwitch();
            }}
            onMouseLeave={onMouseLeave}
            onMouseOver={onMouseOver}
          >
            {CellEditorModes[editMode].subTitle}
          </span>
        )}
        {CellEditorModes[editMode].title && (
          <Tooltip
            mouseEnterDelay={1}
            placement="bottom"
            title="Hide tooltip"
            destroyOnHidden
          >
            <span
              className="px-2 cursor-pointer"
              onClick={() => {
                setTooltipVisible((isVisible) => !isVisible);
                onCloseTooltip();
              }}
              onMouseLeave={onMouseLeave}
              onMouseOver={onMouseOver}
            >
              X
            </span>
          </Tooltip>
        )}
      </span>
    </div>
  );
}
