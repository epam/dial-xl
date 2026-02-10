import { RefObject, useCallback, useContext, useEffect } from 'react';

import { GridApi } from '../../../types';
import { getPx } from '../../../utils';
import { CellEditorContext } from '../CellEditorContext';

type Props = {
  apiRef: RefObject<GridApi>;
};

export function useCellEditorViewport({ apiRef }: Props) {
  const { currentCell, isOpen, setEditorStyle } = useContext(CellEditorContext);

  const onViewportChange = useCallback(() => {
    if (!apiRef.current || !isOpen || !currentCell) return;

    const { col, row } = currentCell;

    const x = apiRef.current.getCellX(col);
    const y = apiRef.current.getCellY(row);

    setEditorStyle((prev) => ({
      ...prev,
      left: getPx(x),
      top: getPx(y),
    }));
  }, [apiRef, currentCell, isOpen, setEditorStyle]);

  useEffect(() => {
    if (!apiRef.current) return;

    const unsubscribe =
      apiRef.current.gridViewportSubscription(onViewportChange);

    return () => {
      unsubscribe();
    };
  }, [apiRef, onViewportChange]);
}
