import { useCallback, useContext } from 'react';

import { ProjectContext } from '../context';
import { EventBusMessages } from '../services';
import { useCreateTableDsl } from './EditDsl';
import { useManualEditDSL } from './ManualEditDSL';
import useEventBus from './useEventBus';
import { useGridApi } from './useGridApi';

export function useCreateTableAction() {
  const eventBus = useEventBus<EventBusMessages>();
  const { onCloneTable } = useManualEditDSL();
  const { createDerivedTable } = useCreateTableDsl();
  const gridApi = useGridApi();
  const { selectedCell } = useContext(ProjectContext);

  const onCreateTableAction = useCallback(
    (
      action: string,
      type: string | undefined,
      insertFormula: string | undefined,
      tableName: string | undefined
    ) => {
      if (action.startsWith('CreateTable')) {
        if (selectedCell && gridApi && insertFormula) {
          eventBus.publish({
            topic: 'FormulaBarFormulasMenuItemApply',
            payload: { formulaName: insertFormula },
          });
        }

        return;
      }

      // Formulas menu action handler
      if (action.startsWith('Action') && tableName && type) {
        switch (type) {
          case 'copy':
            onCloneTable(tableName, {
              col: selectedCell?.col,
              row: selectedCell?.row,
            });
            break;
          case 'derived':
            createDerivedTable(tableName, selectedCell?.col, selectedCell?.row);
            break;
          case 'size':
          default:
            break;
        }

        if (gridApi?.isCellEditorOpen()) {
          gridApi.hideCellEditor();
        }
      }
    },
    [createDerivedTable, eventBus, gridApi, onCloneTable, selectedCell]
  );

  return {
    onCreateTableAction,
  };
}
