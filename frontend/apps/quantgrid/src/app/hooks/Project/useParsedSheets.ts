import {
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  appMessages,
  TableHighlightDataMap,
  WorksheetState,
} from '@frontend/common';
import { ParsedSheet, ParsedSheets, SheetReader } from '@frontend/parser';

import { parseAndSyncSheet, ViewportContext } from '../../context';
import { displayToast } from '../../utils';

type Props = {
  projectName: string | null;
  projectBucket: string | null;
  projectPath: string | null;
  currentSheetName: string | null;
  currentSheetContent: string | null;
  isTemporaryState: boolean;
  isTemporaryStateEditable: boolean;
  projectSheets: WorksheetState[] | null;
  diffDataRef: MutableRefObject<TableHighlightDataMap | null>;
};

export function useParsedSheets({
  projectName,
  projectPath,
  projectBucket,
  currentSheetName,
  currentSheetContent,
  isTemporaryStateEditable,
  isTemporaryState,
  projectSheets,
  diffDataRef,
}: Props) {
  const { viewGridData } = useContext(ViewportContext);

  const [parsedSheet, setParsedSheet] = useState<ParsedSheet | null>(null);
  const [parsedSheets, setParsedSheets] = useState<ParsedSheets>({});

  const parseSheet = useCallback(
    (content: string | undefined, isDSLChange: boolean): void => {
      const sheet = parseAndSyncSheet(
        viewGridData,
        content,
        isDSLChange,
        diffDataRef.current
      );

      setParsedSheet(sheet);

      if (sheet) return;

      displayToast('error', appMessages.parseSheetError);
    },
    [diffDataRef, viewGridData]
  );

  useEffect(() => {
    const updatedParsedSheets: ParsedSheets = {};

    for (const sheet of projectSheets || []) {
      try {
        updatedParsedSheets[sheet.sheetName] = SheetReader.parseSheet(
          sheet.content
        );
      } catch {
        // empty
      }
    }

    if (Object.keys(updatedParsedSheets).length === 0) {
      setParsedSheets({});

      return;
    }
    setParsedSheets(updatedParsedSheets);

    // below triggers, not dependencies
  }, [projectSheets, projectName, projectBucket, projectPath]);

  useEffect(() => {
    const subscription = viewGridData.tableDynamicFieldsLoad$.subscribe(
      ({ tableName, dynamicFields }) => {
        setParsedSheet((parsedSheet) => {
          if (!parsedSheet) return parsedSheet;

          const newParsedSheet = parsedSheet.clone();

          const tableToUpdate = newParsedSheet.tables.find(
            (table) => table.tableName === tableName
          );

          if (!tableToUpdate) return parsedSheet;

          tableToUpdate.setDynamicFields(dynamicFields);

          setParsedSheets((parsedSheets) => {
            if (!parsedSheets || !currentSheetName) return parsedSheets;

            parsedSheets[currentSheetName] = newParsedSheet as ParsedSheet;

            return parsedSheets;
          });

          return newParsedSheet;
        });

        viewGridData.triggerTableDynamicFieldsRequest();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [currentSheetName, viewGridData]);

  useEffect(() => {
    parseSheet(currentSheetContent ?? undefined, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSheetContent]);

  useEffect(() => {
    parseSheet(currentSheetContent ?? undefined, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTemporaryState, isTemporaryStateEditable]);

  return {
    parsedSheets,
    setParsedSheets,
    parsedSheet,
    setParsedSheet,
  };
}
