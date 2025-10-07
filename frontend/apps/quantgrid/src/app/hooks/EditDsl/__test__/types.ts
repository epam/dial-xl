import { GridApi } from '@frontend/canvas-spreadsheet';
import { WorksheetState } from '@frontend/common';
import { ParsedSheet, ParsedSheets } from '@frontend/parser';

import { ViewGridData } from '../../../context';

export type RenderProps = {
  dsl: string;
};

export type TestWrapperProps = {
  appendFn?: () => void;
  appendToFn?: () => void;
  sendFn?: () => void;
  updateSheetContent?: () => Promise<boolean | undefined>;
  manuallyUpdateSheetContent?: () => Promise<boolean | undefined>;
  parsedSheet?: ParsedSheet | null;
  parsedSheets?: ParsedSheets;
  projectName?: string;
  sheetName?: string;
  projectSheets?: WorksheetState[] | [];
  gridApi?: Partial<GridApi> | null;
  viewGridData?: ViewGridData;
  __initialDsl: string;
};
