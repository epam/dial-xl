import { useCallback, useContext } from 'react';

import { PanelName } from '../common';
import { LayoutContext } from '../context';
import { EventBusMessages } from '../services';
import { useControlStore, usePivotStore, useViewStore } from '../store';
import { useCreateTableDsl, useTableEditDsl } from './EditDsl';
import useEventBus from './useEventBus';
import { useGridApi } from './useGridApi';

function useCreateTableAction() {
  const eventBus = useEventBus<EventBusMessages>();
  const { cloneTable } = useTableEditDsl();
  const { createDerivedTable } = useCreateTableDsl();
  const gridApi = useGridApi();
  const selectedCell = useViewStore((s) => s.selectedCell);
  const changePivotTableWizardMode = usePivotStore(
    (s) => s.changePivotTableWizardMode
  );
  const openControlCreateWizard = useControlStore(
    (s) => s.openControlCreateWizard
  );
  const { openPanel } = useContext(LayoutContext);

  const onCreateTableAction = useCallback(
    (
      action: string,
      type: string | undefined,
      insertFormula: string | undefined,
      tableName: string | undefined
    ) => {
      if (action === 'CreateControl') {
        openControlCreateWizard();
        openPanel(PanelName.Details);

        return;
      }
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
            cloneTable(tableName, {
              col: selectedCell?.col,
              row: selectedCell?.row,
            });
            break;
          case 'derived':
            createDerivedTable(tableName, selectedCell?.col, selectedCell?.row);
            break;
          case 'pivot':
            changePivotTableWizardMode('create', tableName);
            openPanel(PanelName.Details);
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
    [
      openControlCreateWizard,
      selectedCell,
      gridApi,
      eventBus,
      cloneTable,
      createDerivedTable,
      changePivotTableWizardMode,
      openPanel,
    ]
  );

  return {
    onCreateTableAction,
  };
}

export default useCreateTableAction;
