import { RefObject, useCallback, useEffect } from 'react';

import { getDataScroller } from '@frontend/common';

import { gridDataContainerClass } from '../../../constants';
import { Grid } from '../../../grid';
import { getPx, round } from '../../../utils';

export function useCellEditorLayerPosition(
  viewportNode: RefObject<HTMLDivElement>,
  api: Grid | null
) {
  const updateLayerPosition = useCallback(
    (rowNumberWidth = 0) => {
      if (!api) return;

      const dataScroller = getDataScroller();
      const dataContainer = document.querySelector(
        `.${gridDataContainerClass}`
      );

      if (!dataScroller || !dataContainer || !viewportNode.current) return;

      const dataScrollerRect = dataScroller.getBoundingClientRect();
      const scrollBarSize = 17;

      viewportNode.current.style.left = getPx(round(rowNumberWidth));
      viewportNode.current.style.width = getPx(
        round(dataScrollerRect.width - scrollBarSize)
      );
      viewportNode.current.style.height = getPx(
        round(dataScrollerRect.height - scrollBarSize)
      );
    },
    [api, viewportNode]
  );

  useEffect(() => {
    updateLayerPosition();
  }, [updateLayerPosition]);

  useEffect(() => {
    if (!api) return;

    const rowNumberResizeSubscription = api.rowNumberResize$.subscribe(
      ({ width }) => {
        updateLayerPosition(width);
      }
    );

    return () => {
      rowNumberResizeSubscription.unsubscribe();
    };
  }, [api, updateLayerPosition]);

  useEffect(() => {
    const dataScroller = getDataScroller();
    if (!dataScroller) return;

    const observer = new ResizeObserver(() => updateLayerPosition());
    observer.observe(dataScroller);

    return () => {
      observer.disconnect();
    };
  }, [updateLayerPosition]);
}
