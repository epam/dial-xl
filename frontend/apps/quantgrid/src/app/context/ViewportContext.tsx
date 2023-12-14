import {
  createContext,
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ChartData, ColumnData, TableData } from '@frontend/common';
import { dynamicFieldName } from '@frontend/parser';

import { CachedViewport } from '../common';
import { saveChartColumnData, saveChunksToCache } from '../services';

export type CachedViewportByTable = Record<string, CachedViewport>;

export type DynamicFieldsByTable = {
  [tableName: string]: string[];
};

type ViewportContextActions = {
  tableData: TableData;
  chartKeys: TableData;
  chartData: ChartData;
  dynamicFields: DynamicFieldsByTable;
  cachedViewport: CachedViewportByTable;
  onColumnDataResponse: (columnData: ColumnData) => void;
  onChartKeysResponse: (columnData: ColumnData) => void;
  clearCachedTableData: () => void;
  updateCachedViewport: (updatedCachedViewport: CachedViewportByTable) => void;
};

export const ViewportContext = createContext<ViewportContextActions>(
  {} as ViewportContextActions
);

export function ViewportContextProvider({ children }: PropsWithChildren) {
  const [tableData, setTableData] = useState<TableData>({});
  const cachedViewport = useRef<CachedViewportByTable>({});
  const [dynamicFields, setDynamicFields] = useState<DynamicFieldsByTable>({});
  const [chartKeys, setChartKeys] = useState<TableData>({});
  const [chartData, setChartData] = useState<ChartData>({});

  const updateCachedViewport = useCallback(
    (updatedCachedViewport: CachedViewportByTable) => {
      cachedViewport.current = updatedCachedViewport;
    },
    []
  );

  const clearCachedTableData = useCallback(() => {
    setTableData({});
    setChartData({});
    setChartKeys({});
    setDynamicFields({});
    cachedViewport.current = {};
  }, []);

  const onColumnDataResponse = useCallback(
    (columnData: ColumnData) => {
      const isPeriodSeriesData = columnData.periodSeries.length > 0;
      const { startRow, endRow } = columnData;
      const isChartPeriodSeriesEmptyData =
        Math.abs(parseInt(startRow) - parseInt(endRow)) === 1;

      if (isPeriodSeriesData) {
        setChartData((chartData) => {
          return saveChartColumnData({ ...chartData }, columnData);
        });

        return;
      }

      if (isChartPeriodSeriesEmptyData) return;

      setTableData((tableData) => {
        return saveChunksToCache({ ...tableData }, columnData);
      });

      if (columnData.columnName !== dynamicFieldName) return;

      const updatedDynamicFields = { ...dynamicFields };
      updatedDynamicFields[columnData.tableName] = columnData.data;
      setDynamicFields(updatedDynamicFields);
    },
    [dynamicFields]
  );

  const onChartKeysResponse = useCallback((columnData: ColumnData) => {
    setChartKeys((chartKeys) => {
      return saveChunksToCache({ ...chartKeys }, columnData);
    });
  }, []);

  const value = useMemo(
    () => ({
      chartData,
      chartKeys,
      onColumnDataResponse,
      onChartKeysResponse,
      clearCachedTableData,
      tableData,
      dynamicFields,
      cachedViewport: cachedViewport.current,
      updateCachedViewport,
    }),
    [
      chartData,
      chartKeys,
      onColumnDataResponse,
      onChartKeysResponse,
      clearCachedTableData,
      tableData,
      dynamicFields,
      updateCachedViewport,
    ]
  );

  return (
    <ViewportContext.Provider value={value}>
      {children}
    </ViewportContext.Provider>
  );
}
