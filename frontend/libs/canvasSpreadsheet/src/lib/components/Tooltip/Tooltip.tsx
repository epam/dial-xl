import { Tooltip as AntdTooltip } from 'antd';
import { RefObject, useCallback, useEffect, useMemo, useState } from 'react';
import { Subscription } from 'rxjs';

import { cellEditorWrapperId } from '../../constants';
import { GridApi } from '../../types';
import { filterByTypeAndCast, getPx } from '../../utils';
import {
  EventTypeStartMoveMode,
  EventTypeStopMoveMode,
  GridEvent,
} from '../GridApiWrapper';
import {
  GridTooltipEventClose,
  GridTooltipEventOpen,
  GridTooltipEventType,
} from './types';

const defaultPosition = { x: -9999, y: -9999 };

type Props = {
  apiRef: RefObject<GridApi>;
};

export function Tooltip({ apiRef }: Props) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState(defaultPosition);
  const [targetPos, setTargetPos] = useState(defaultPosition);
  const [tooltipContent, setTooltipContent] = useState('');
  const [restrictOpening, setRestrictOpening] = useState(false);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const api = useMemo(() => {
    return apiRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef.current]);

  const clear = useCallback(() => {
    setTooltipOpen(false);
    setTooltipContent('');
    setTooltipPos(defaultPosition);
    setTargetPos(defaultPosition);
  }, []);

  const showTooltip = useCallback(
    (x: number, y: number, content: string) => {
      if (restrictOpening) return;

      const container = document.getElementById(cellEditorWrapperId);

      if (!container) return;

      const { width, height } = container.getBoundingClientRect();

      if (targetPos.x === x && targetPos.y === y) return;

      setTooltipOpen(false);
      setTooltipContent(content);

      setTargetPos({ x, y });
      setTooltipPos({
        x,
        y,
      });

      setHeight(height);
      setWidth(width);

      setTimeout(() => {
        setTooltipOpen(true);
      }, 1000);
    },
    [restrictOpening, targetPos]
  );

  useEffect(() => {
    if (!api) return;

    const subscriptions: Subscription[] = [];

    subscriptions.push(
      api.tooltipEvent$
        .pipe(
          filterByTypeAndCast<GridTooltipEventOpen>(GridTooltipEventType.Open)
        )
        .subscribe(({ x, y, content }) => {
          showTooltip(x, y, content);
        })
    );

    subscriptions.push(
      api.tooltipEvent$
        .pipe(
          filterByTypeAndCast<GridTooltipEventClose>(GridTooltipEventType.Close)
        )
        .subscribe(() => {
          clear();
        })
    );

    subscriptions.push(
      api.events$
        .pipe(
          filterByTypeAndCast<EventTypeStartMoveMode>(GridEvent.startMoveMode)
        )
        .subscribe(() => {
          setRestrictOpening(true);
        })
    );

    subscriptions.push(
      api.events$
        .pipe(
          filterByTypeAndCast<EventTypeStopMoveMode>(GridEvent.stopMoveMode)
        )
        .subscribe(() => {
          setRestrictOpening(false);
        })
    );

    return () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, [api, clear, showTooltip]);

  return (
    <div
      className="h-full w-full absolute left-0 top-0 pointer-events-none overflow-hidden z-[305]"
      id="tooltipContainer"
    >
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
