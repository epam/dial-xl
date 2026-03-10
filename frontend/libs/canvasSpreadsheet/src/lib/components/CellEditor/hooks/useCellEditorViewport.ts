import { useCallback, useContext, useEffect } from 'react';

import { GridViewportContext } from '../../../context';
import { getPx } from '../../../utils';
import { CellEditorContext } from '../CellEditorContext';

export function useCellEditorViewport() {
  const { gridViewportSubscriber } = useContext(GridViewportContext);
  const { currentCell, isOpen, setEditorStyle } = useContext(CellEditorContext);

  const onViewportChange = useCallback(
    (deltaX: number, deltaY: number) => {
      if (!isOpen || !currentCell) return;

      setEditorStyle((prev) => ({
        ...prev,
        left: getPx(parseInt(prev.left) - deltaX),
        top: getPx(parseInt(prev.top) - deltaY),
      }));
    },
    [currentCell, isOpen, setEditorStyle],
  );

  useEffect(() => {
    const unsubscribe =
      gridViewportSubscriber.current.subscribe(onViewportChange);

    return () => {
      unsubscribe();
    };
  }, [gridViewportSubscriber, onViewportChange]);
}
