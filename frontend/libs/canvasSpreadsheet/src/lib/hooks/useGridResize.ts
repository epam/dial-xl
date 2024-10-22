import * as PIXI from 'pixi.js';
import { RefObject, useCallback, useEffect, useState } from 'react';

type Props = {
  gridContainerRef: RefObject<HTMLDivElement | null>;
  app: PIXI.Application | null;
};

export function useGridResize({ gridContainerRef, app }: Props) {
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

  const updateGridSize = useCallback(() => {
    if (gridContainerRef.current) {
      const { width, height } =
        gridContainerRef.current.getBoundingClientRect();
      setGridSize({ width, height });
    }
  }, [gridContainerRef]);

  useEffect(() => {
    updateGridSize();
  }, [updateGridSize]);

  useEffect(() => {
    if (!gridContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setGridSize({ width, height });

        if (app) {
          app.renderer.resize(width, height);
          app.render();
        }
      }
    });

    observer.observe(gridContainerRef.current);

    return () => observer.disconnect();
  }, [app, gridContainerRef]);

  return { gridHeight: gridSize.height, gridWidth: gridSize.width };
}
