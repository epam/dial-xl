import { MutableRefObject } from 'react';

import { Grid } from '../grid';
import { GridService } from '../services';
import { GridCallbacks } from '../types';
import { useCellActions } from './useCellActions';
import { useDNDTables } from './useDNDTables';
import { useScrollEvents } from './useScrollEvents';
import { useSelectionEvents } from './useSelectionEvents';
import { useShortcuts } from './useShortcuts';
import { useTableActions } from './useTableActions';

export function useGridEvents(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>
) {
  useSelectionEvents(apiRef, gridServiceRef, gridCallbacksRef);
  useScrollEvents(apiRef, gridCallbacksRef);
  useShortcuts(apiRef, gridServiceRef, gridCallbacksRef);
  useCellActions(apiRef, gridServiceRef, gridCallbacksRef);
  useDNDTables(apiRef, gridServiceRef, gridCallbacksRef);
  useTableActions(apiRef, gridServiceRef, gridCallbacksRef);
}
