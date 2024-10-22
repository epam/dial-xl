import { useEffect, useRef, useState } from 'react';

import { KeyboardCode } from '@frontend/common';

import { getPx } from '../../../utils';
import { ChartConfig } from '../types';

type Props = {
  chartConfig: ChartConfig;
  onChartResize: (x: number, y: number) => void;
};

export function ResizeHandler({ chartConfig, onChartResize }: Props) {
  const isResizing = useRef(false);
  const handlerRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(chartConfig.width);
  const [height, setHeight] = useState(
    chartConfig.height + chartConfig.toolBarHeight
  );

  useEffect(() => {
    if (isResizing.current) return;

    setWidth(chartConfig.width);
    setHeight(chartConfig.height + chartConfig.toolBarHeight);
  }, [chartConfig]);

  useEffect(() => {
    let startMouseX = 0;
    let startMouseY = 0;

    function onMove(e: MouseEvent) {
      if (!isResizing.current) return;

      const updateWidth = chartConfig.width + e.pageX - startMouseX;
      const initialHeight = chartConfig.height + chartConfig.toolBarHeight;
      const updateHeight = initialHeight + e.pageY - startMouseY;

      if (updateWidth >= chartConfig.minResizeWidth) {
        setWidth(updateWidth);
      }

      if (updateHeight >= chartConfig.minResizeHeight) {
        setHeight(updateHeight);
      }
    }

    function onStopResize(e: MouseEvent) {
      if (!isResizing.current) return;

      const border = borderRef.current;

      if (!border) return;

      const borderRect = border?.getBoundingClientRect();

      const x = chartConfig.toolBarLeft + borderRect.width;
      const y = chartConfig.toolBarTop + borderRect.height;

      onChartResize(x, y);
      cleanup();
    }

    function onResizeCancel(e: KeyboardEvent) {
      if (e.key === KeyboardCode.Escape && isResizing.current) {
        cleanup();
      }
    }

    function onStartResize(e: MouseEvent) {
      if ((e.target as HTMLDivElement) !== handlerRef.current) return;

      isResizing.current = true;
      startMouseX = e.pageX;
      startMouseY = e.pageY;

      document.body.style.userSelect = 'none';
      document.body.addEventListener('mouseup', onStopResize, true);
      document.body.addEventListener('mousemove', onMove);
      document.body.addEventListener('keydown', onResizeCancel);
    }

    function cleanup() {
      document.body.style.userSelect = 'auto';
      document.body.removeEventListener('mouseup', onStopResize, true);
      document.body.removeEventListener('mousemove', onMove, true);
      document.body.removeEventListener('keydown', onResizeCancel);

      isResizing.current = false;
      setWidth(chartConfig.width);
      setHeight(chartConfig.height + chartConfig.toolBarHeight);
    }

    document.body.addEventListener('mousedown', onStartResize, true);

    return () => {
      document.body.removeEventListener('mousedown', onStartResize, true);
      cleanup();
    };
  }, [chartConfig, onChartResize]);

  return (
    <>
      {isResizing.current && (
        <div
          className="absolute border-2 border-strokeGridAccentPrimary"
          ref={borderRef}
          style={{
            width: getPx(width),
            height: getPx(height),
            top: getPx(chartConfig.toolBarTop),
            left: getPx(chartConfig.toolBarLeft),
          }}
        />
      )}
      <div
        className="w-2 h-2 absolute box-border rounder-[3px] bg-strokeGridAccentPrimary cursor-nwse-resize pointer-events-auto"
        ref={handlerRef}
        style={{
          top: getPx(chartConfig.toolBarTop + height - 6),
          left: getPx(chartConfig.toolBarLeft + width - 6),
        }}
      />
    </>
  );
}
