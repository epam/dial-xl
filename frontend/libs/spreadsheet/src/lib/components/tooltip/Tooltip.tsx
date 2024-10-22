import { Tooltip as AntdTooltip } from 'antd';
import { MutableRefObject, useCallback, useEffect, useState } from 'react';

import {
  datasetTooltipText,
  errorTooltipTriggerClass,
  gridDataContainerClass,
} from '../../constants';
import {
  filterByTypeAndCast,
  Grid,
  GridSelectionEventStartMoveMode,
  GridSelectionEventStopMoveMode,
  GridSelectionEventType,
} from '../../grid';
import { GridService } from '../../services';
import { getCellElementDimensions, getGridRoot, getPx } from '../../utils';

const defaultPosition = { x: -9999, y: -9999 };

type Props = {
  gridServiceRef: MutableRefObject<GridService | null>;
  api: Grid | null;
};

export function Tooltip({ gridServiceRef, api }: Props) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState(defaultPosition);
  const [targetPos, setTargetPos] = useState(defaultPosition);
  const [tooltipContent, setTooltipContent] = useState('');
  const [restrictOpening, setRestrictOpening] = useState(false);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const clear = useCallback(() => {
    setTooltipOpen(false);
    setTooltipContent('');
    setTooltipPos(defaultPosition);
    setTargetPos(defaultPosition);
  }, []);

  const showTooltip = useCallback(
    (content: string, target: any) => {
      const { width, height, x, y } = target.getBoundingClientRect();

      if (targetPos.x === x && targetPos.y === y) return;

      const gridRoot = getGridRoot();
      const gridRootRect = gridRoot?.getBoundingClientRect();
      const { top, left } = gridRootRect;

      setTooltipOpen(false);
      setTooltipContent(content);

      setTargetPos({ x, y });
      setTooltipPos({
        x: x - left,
        y: y - top + width / 2,
      });

      setHeight(height);
      setWidth(width);

      setTimeout(() => {
        setTooltipOpen(true);
      }, 1000);
    },
    [targetPos]
  );

  const onMouseOver = useCallback(
    (event: any) => {
      if (!api || restrictOpening) return;

      const dataContainer = document.querySelector(
        `.${gridDataContainerClass}`
      );

      if (!dataContainer) return;

      let target = event.target;

      while (target && target !== dataContainer) {
        if (target.nodeName === 'SPAN') {
          if (target.classList.contains(errorTooltipTriggerClass)) {
            const { col, row } = getCellElementDimensions(target.parentNode);

            if (col === -1 || row === -1) break;

            const cell = gridServiceRef.current?.getCellValue(row, col);

            if (
              cell?.isFieldHeader &&
              cell?.field?.hasError &&
              cell?.field?.errorMessage
            ) {
              showTooltip(cell.field.errorMessage, target);

              return;
            }

            if (!cell?.isFieldHeader && cell?.hasError && cell?.errorMessage) {
              showTooltip(cell.errorMessage, target);

              return;
            }
          }
        }

        if (target.nodeName === 'BUTTON') {
          if (target.dataset[datasetTooltipText]) {
            showTooltip(target.dataset[datasetTooltipText], target);

            return;
          }
        }

        target = target.parentNode;
      }

      clear();
    },
    [api, restrictOpening, clear, gridServiceRef, showTooltip]
  );

  useEffect(() => {
    if (!api) return;

    const startMoveModeSubscription = api.selectionEvents$
      .pipe(
        filterByTypeAndCast<GridSelectionEventStartMoveMode>(
          GridSelectionEventType.StartMoveMode
        )
      )
      .subscribe(() => {
        setRestrictOpening(true);
      });

    const stopMoveModeSubscription = api.selectionEvents$
      .pipe(
        filterByTypeAndCast<GridSelectionEventStopMoveMode>(
          GridSelectionEventType.StopMoveMode
        )
      )
      .subscribe(() => {
        setRestrictOpening(false);
      });

    return () => {
      [startMoveModeSubscription, stopMoveModeSubscription].forEach((s) =>
        s.unsubscribe()
      );
    };
  }, [api]);

  useEffect(() => {
    const dataContainer = document.querySelector(`.${gridDataContainerClass}`);

    dataContainer?.addEventListener('mouseover', onMouseOver);

    return () => {
      dataContainer?.removeEventListener('mouseover', onMouseOver);
    };
  }, [onMouseOver]);

  return (
    <div className="h-full w-full absolute" id="tooltipContainer">
      <AntdTooltip open={tooltipOpen} title={tooltipContent}>
        <div
          className="absolute"
          style={{
            top: tooltipPos.y,
            left: tooltipPos.x,
            width: getPx(width),
            height: getPx(height),
            backgroundColor: 'transparent',
            display: tooltipOpen ? 'block' : 'none',
          }}
        ></div>
      </AntdTooltip>
    </div>
  );
}
