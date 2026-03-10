import { RefObject, useCallback, useContext, useEffect, useState } from 'react';

import { GridData, ViewportEdges } from '@frontend/canvas-spreadsheet';

import { getExtendedRoundedBorders } from '../../../../context';
import { ExcelPreviewViewportContext } from '../ExcelPreviewViewportContext';

interface GridDataSyncResult {
  data: GridData;
  updateDataFromViewport: () => void;
}

export function useExcelPreviewGridDataSync(
  currentViewport: RefObject<ViewportEdges | null>,
  currentExtendedViewport: RefObject<ViewportEdges | null>,
): GridDataSyncResult {
  const { viewGridData } = useContext(ExcelPreviewViewportContext);

  const [data, setData] = useState<GridData>({});

  const updateDataFromViewport = useCallback(() => {
    if (!currentExtendedViewport.current) return;

    setData(viewGridData.toGridData(currentExtendedViewport.current));
  }, [viewGridData, currentExtendedViewport]);

  useEffect(() => {
    const handleDataUpdate = () => {
      if (currentViewport.current) {
        const { startRow, endRow, startCol, endCol } = currentViewport.current;
        const [extStartRow, extEndRow] = getExtendedRoundedBorders(
          startRow,
          endRow,
        );
        const [extStartCol, extEndCol] = getExtendedRoundedBorders(
          startCol,
          endCol,
        );

        const extendedViewport = {
          startRow: extStartRow,
          endRow: extEndRow,
          startCol: extStartCol,
          endCol: extEndCol,
        };

        currentExtendedViewport.current = extendedViewport;
        setData(viewGridData.toGridData(extendedViewport));
      }
    };

    handleDataUpdate();

    const dataUpdateSubscription =
      viewGridData.shouldUpdate$.subscribe(handleDataUpdate);

    return () => {
      dataUpdateSubscription.unsubscribe();
    };
  }, [viewGridData, currentViewport, currentExtendedViewport]);

  return {
    data,
    updateDataFromViewport,
  };
}
