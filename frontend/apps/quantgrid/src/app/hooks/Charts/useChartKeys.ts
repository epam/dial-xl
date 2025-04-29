import { useCallback, useContext, useEffect, useRef } from 'react';

import { Viewport } from '@frontend/common';
import {
  collectTableNames,
  escapeTableName,
  ParsedField,
  ParsedTable,
  unescapeFieldName,
  unescapeTableName,
} from '@frontend/parser';

import { ProjectContext, ViewportContext } from '../../context';
import { createUniqueName, uniqueId } from '../../services';
import { createVirtualChartTableDSL, hasValuesFieldName } from '../../utils';

type SendChartKeyViewportsParams = {
  targetTableName?: string;
  targetFieldName?: string;
  viewportRequest?: Viewport[];
};

type CachedKeyViewports = {
  [tableName: string]: {
    [fieldName: string]: number;
  };
};

const keysPerPage = 1000;

export function useChartKeys() {
  const { viewGridData } = useContext(ViewportContext);
  const {
    projectName,
    sheetName,
    parsedSheets,
    sheetContent,
    getVirtualProjectViewport,
  } = useContext(ProjectContext);

  const cachedKeyViewports = useRef<CachedKeyViewports>({});

  /**
   * Get chart key values that will be used in the chart selector dropdown.
   * For each chart table field which is a selector:
   * - create a virtual table with unique and sorted values
   * - send a viewport request for the virtual tables
   *
   * Call with viewport request to get chart keys for tables inside current viewport
   * Call with targetTableName/targetFieldName to get chart key values for a specific table and field
   */
  const sendChartKeyViewports = useCallback(
    ({
      targetTableName,
      targetFieldName,
      viewportRequest,
    }: SendChartKeyViewportsParams) => {
      const virtualRequests: Viewport[] = [];
      const virtualTablesDSL: string[] = [];

      const tables: ParsedTable[] = getTargetTables();

      for (const table of tables) {
        const { tableName } = table;
        const unescapedTableName = unescapeTableName(tableName);

        for (const field of table.fields) {
          const { fieldName } = field.key;

          if (targetFieldName && fieldName !== targetFieldName) continue;
          if (!field.isChartSelector()) continue;

          buildVirtualViewportForChartKey(
            table,
            field,
            unescapedTableName,
            virtualRequests,
            virtualTablesDSL
          );
        }
      }

      if (virtualRequests.length > 0 && virtualTablesDSL.length > 0) {
        getVirtualProjectViewport(virtualRequests, virtualTablesDSL);
      }

      function buildVirtualViewportForChartKey(
        table: ParsedTable,
        field: ParsedField,
        unescapedTableName: string,
        virtualRequests: Viewport[],
        virtualTablesDSL: string[]
      ) {
        const { tableName } = table;
        const { fieldName } = field.key;

        const virtualTableName = getOrCreateVirtualTableName(
          tableName,
          fieldName,
          unescapedTableName
        );

        const cachedRowNumber =
          cachedKeyViewports.current[tableName]?.[fieldName] || 0;
        const maxRowNumber =
          viewGridData.getVirtualChartDataMaxRows(virtualTableName);

        if (maxRowNumber < cachedRowNumber) return;

        const baseVirtualRequest = {
          start_row: cachedRowNumber,
          end_row: cachedRowNumber + keysPerPage,
        };

        virtualRequests.push({
          ...baseVirtualRequest,
          fieldKey: {
            field: fieldName,
            table: virtualTableName,
          },
        });

        virtualRequests.push({
          ...baseVirtualRequest,
          fieldKey: {
            field: hasValuesFieldName,
            table: virtualTableName,
          },
        });

        const virtualTableDSL = createVirtualChartTableDSL(
          table,
          field,
          virtualTableName
        );

        virtualTablesDSL.push(virtualTableDSL);

        viewGridData.addChartKeyVirtualTable(
          tableName,
          fieldName,
          escapeTableName(virtualTableName)
        );

        if (!cachedKeyViewports.current[tableName]) {
          cachedKeyViewports.current[tableName] = {};
        }
        cachedKeyViewports.current[tableName][fieldName] =
          cachedRowNumber + keysPerPage;
      }

      function getOrCreateVirtualTableName(
        tableName: string,
        fieldName: string,
        unescapedTableName: string
      ): string {
        const virtualTableName = viewGridData.getVirtualTableName(
          tableName,
          fieldName
        );

        if (virtualTableName) return unescapeTableName(virtualTableName);

        const sanitizedFieldName = unescapeFieldName(fieldName);

        return createUniqueName(
          `${unescapedTableName}_selector_for_field_${sanitizedFieldName}_${uniqueId()}`,
          collectTableNames(parsedSheets)
        );
      }

      function getTargetTables(): ParsedTable[] {
        const tables: ParsedTable[] = [];
        const parsedSheetTables = viewGridData
          .getTablesData()
          .map((t) => t.table);

        if (targetTableName) {
          const table = parsedSheetTables.find(
            (t) => t.tableName === targetTableName
          );
          if (table) tables.push(table);
        } else if (viewportRequest) {
          const uniqueRequestedTableNames = new Set(
            viewportRequest
              .filter((r) => r.fieldKey?.table)
              .map((r) => r?.fieldKey?.table)
          );
          tables.push(
            ...parsedSheetTables.filter(
              (t) =>
                uniqueRequestedTableNames.has(unescapeTableName(t.tableName)) &&
                t.isChart()
            )
          );
        }

        return tables;
      }
    },
    [getVirtualProjectViewport, parsedSheets, viewGridData]
  );

  /**
   * Handle lazy loading of the chart keys in the chart key dropdown
   * Called when the user scrolls the dropdown to the bottom
   */
  const getMoreChartKeys = useCallback(
    (tableName: string, fieldName: string) => {
      if (!projectName || !sheetName || !sheetContent || !parsedSheets) return;

      sendChartKeyViewports({
        targetTableName: tableName,
        targetFieldName: fieldName,
      });
    },
    [projectName, sheetName, sheetContent, parsedSheets, sendChartKeyViewports]
  );

  /**
   * Clear cached key (to reload them on next viewport request) when the sheet content changes
   */
  useEffect(() => {
    cachedKeyViewports.current = {};
  }, [sheetContent, sheetName, projectName, parsedSheets]);

  return {
    getMoreChartKeys,
    sendChartKeyViewports,
  };
}
