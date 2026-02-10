import {
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  GridData,
  GridTable,
  ViewportEdges,
} from '@frontend/canvas-spreadsheet';

import {
  getExtendedRoundedBorders,
  ProjectContext,
  ViewportContext,
} from '../../context';

interface GridDataSyncResult {
  data: GridData;
  tableStructure: GridTable[];
  updateDataFromViewport: () => void;
}

export function useGridDataSync(
  currentViewport: MutableRefObject<ViewportEdges | null>,
  currentExtendedViewport: MutableRefObject<ViewportEdges | null>
): GridDataSyncResult {
  const { viewGridData } = useContext(ViewportContext);
  const { projectName } = useContext(ProjectContext);

  const [tableStructure, setTableStructure] = useState<GridTable[]>([]);
  const [data, setData] = useState<GridData>({});

  const updateDataFromViewport = useCallback(() => {
    if (!currentExtendedViewport.current) return;

    setData(viewGridData.toGridData(currentExtendedViewport.current));
  }, [viewGridData, currentExtendedViewport]);

  // Subscribe to data updates
  useEffect(() => {
    if (!projectName) return;

    const handleDataUpdate = () => {
      if (currentViewport.current) {
        const { startRow, endRow, startCol, endCol } = currentViewport.current;
        const [extStartRow, extEndRow] = getExtendedRoundedBorders(
          startRow,
          endRow
        );
        const [extStartCol, extEndCol] = getExtendedRoundedBorders(
          startCol,
          endCol
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
      setTableStructure(viewGridData.getGridTableStructure());
    };

    // Initial data update
    handleDataUpdate();

    const dataUpdateSubscription =
      viewGridData.shouldUpdate$.subscribe(handleDataUpdate);

    return () => {
      dataUpdateSubscription.unsubscribe();
    };
  }, [projectName, viewGridData, currentViewport, currentExtendedViewport]);

  return {
    data,
    tableStructure,
    updateDataFromViewport,
  };
}
