import { Dropdown } from 'antd';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  FormulasContextMenuKeyData,
  getFormulasMenuItems,
  MenuItem,
  useClickOutside,
} from '@frontend/common';

import { InputsContext, ProjectContext } from '../../context';
import {
  useCreateTableAction,
  useCreateTableDsl,
  useGridApi,
  useTableEditDsl,
} from '../../hooks';
import useEventBus from '../../hooks/useEventBus';
import { EventBusMessages } from '../../services';

type Props = {
  position: { x: number; y: number } | undefined;
  place: 'CodeEditor' | 'FormulaBar' | 'CellEditor' | undefined;
};

export function FormulasMenu({ position, place }: Props) {
  const { selectedCell, parsedSheets } = useContext(ProjectContext);
  const { functions } = useContext(ProjectContext);
  const gridApi = useGridApi();
  const eventBus = useEventBus<EventBusMessages>();
  const { inputList } = useContext(InputsContext);
  const { createDerivedTable, createManualTable } = useCreateTableDsl();
  const { cloneTable } = useTableEditDsl();
  const { onCreateTableAction } = useCreateTableAction();

  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuItems, setContextMenuItems] = useState<MenuItem[]>([]);
  const clickRef = useRef<HTMLDivElement>(null);

  const onClickOutside = useCallback(() => {
    if (contextMenuOpen) {
      setContextMenuOpen(false);
    }
  }, [contextMenuOpen]);

  useClickOutside(clickRef, onClickOutside);

  const onClick = useCallback(
    (info: MenuInfo) => {
      const parsedKey = JSON.parse(info.key);
      const data: FormulasContextMenuKeyData = parsedKey.data;
      const action: string = parsedKey.action;

      if (action.startsWith('Action')) {
        switch (data.type) {
          case 'copy': {
            if (data.tableName) {
              cloneTable(data.tableName, {
                col: selectedCell?.col ?? 1,
                row: selectedCell?.row ?? 1,
              });
            }
            break;
          }
          case 'derived': {
            if (data.tableName) {
              createDerivedTable(
                data.tableName,
                selectedCell?.col ?? 1,
                selectedCell?.row ?? 1
              );
            }
            break;
          }
          case 'pivot':
            if (data.tableName) {
              onCreateTableAction(action, data.type, undefined, data.tableName);
            }
            break;
          case 'size':
          default:
            break;
        }

        if (gridApi?.isCellEditorOpen()) {
          gridApi.hideCellEditor();
        }

        setContextMenuOpen(false);

        return;
      }

      //Usual formulas handler
      const value = data.insertFormula;
      if (value) {
        if (place === 'CellEditor' && gridApi) {
          gridApi.insertCellEditorValue(value, {
            valueCursorOffset: -1,
          });
        } else if (place === 'FormulaBar' && gridApi) {
          eventBus.publish({
            topic: 'FormulaBarFormulasMenuItemApply',
            payload: { formulaName: value },
          });
        }
      }
      setContextMenuOpen(false);
    },
    [
      createDerivedTable,
      eventBus,
      gridApi,
      cloneTable,
      onCreateTableAction,
      place,
      selectedCell,
    ]
  );

  const handleCreateTableBySize = useCallback(
    (cols: number, rows: number) => {
      const colsItems = new Array(cols).fill('');
      const rowsItems = new Array(rows).fill(colsItems);
      createManualTable(
        selectedCell?.col ?? 1,
        selectedCell?.row ?? 1,
        rowsItems
      );
    },
    [createManualTable, selectedCell?.col, selectedCell?.row]
  );

  useEffect(() => {
    const tableNames = Object.values(parsedSheets)
      .flatMap((sheet) => sheet.tables.map((t) => t.tableName))
      .sort();

    setContextMenuItems(
      getFormulasMenuItems(
        functions,
        tableNames,
        inputList,
        handleCreateTableBySize
      )
    );
  }, [functions, handleCreateTableBySize, inputList, parsedSheets]);

  useEffect(() => {
    setContextMenuOpen(!!position);
  }, [position]);

  return (
    <Dropdown
      autoAdjustOverflow={true}
      destroyOnHidden={true}
      forceRender={true}
      menu={{ items: contextMenuItems, onClick }}
      open={contextMenuOpen}
      rootClassName="formulas-menu"
    >
      <div
        id="area"
        ref={clickRef}
        style={{
          position: 'absolute',
          top: `${position?.y ?? 0}px`,
          left: `${position?.x ?? 0}px`,
        }}
      />
    </Dropdown>
  );
}
