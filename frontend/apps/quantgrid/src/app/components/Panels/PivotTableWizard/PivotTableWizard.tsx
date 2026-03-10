import { Button, Collapse } from 'antd';
import { CollapseProps } from 'antd/es/collapse/Collapse';
import cx from 'classnames';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { primaryButtonClasses } from '@frontend/common';

import { ProjectContext } from '../../../context';
import { usePivotStore } from '../../../store';
import { CollapseIcon } from '../Chart/Components';
import { PositionInputs, TableSelector, toSelectOption } from '../Shared';
import { StructureSection } from './components';
import { PivotWizardContext } from './context';
import { usePivotTableSetup } from './hooks';

enum CollapseSection {
  SourceTable = 'sourceTable',
  Location = 'location',
  Structure = 'structure',
}

export function PivotTableWizard() {
  const { pivotTableName, pivotTableWizardMode, changePivotTableWizardMode } =
    usePivotStore(
      useShallow((s) => ({
        pivotTableName: s.pivotTableName,
        pivotTableWizardMode: s.pivotTableWizardMode,
        changePivotTableWizardMode: s.changePivotTableWizardMode,
      })),
    );

  const { parsedSheets } = useContext(ProjectContext);
  const {
    onChangeTableName,
    selectedTableName,
    startCol,
    startRow,
    setStartCol,
    setStartRow,
  } = useContext(PivotWizardContext);

  usePivotTableSetup();

  const tableNameOptions = useMemo(() => {
    return Object.values(parsedSheets ?? {}).flatMap(({ tables }) =>
      tables.map(({ tableName }) => toSelectOption(tableName)),
    );
  }, [parsedSheets]);

  const [collapseActiveKeys, setCollapseActiveKeys] = useState<
    CollapseSection[]
  >([CollapseSection.Structure]);

  const collapseItems = useMemo((): CollapseProps['items'] => {
    const items: CollapseProps['items'] = [
      {
        key: CollapseSection.SourceTable,
        label: 'Table Source',
        children: (
          <TableSelector
            inputName="pivotSourceTableName"
            selectedTableName={selectedTableName}
            tableNameOptions={tableNameOptions}
            onTableChange={onChangeTableName}
          />
        ),
      },
    ];

    if (selectedTableName && pivotTableWizardMode === 'create') {
      const isOpen = collapseActiveKeys.includes(CollapseSection.Location);

      items.push({
        key: CollapseSection.Location,
        label: isOpen ? (
          'Location'
        ) : (
          <>
            <span>Location: </span>
            <span className="font-normal">
              ({startRow},{startCol})
            </span>
          </>
        ),
        children: (
          <PositionInputs
            setStartCol={setStartCol}
            setStartRow={setStartRow}
            startCol={startCol}
            startRow={startRow}
          />
        ),
      });
    }

    if (selectedTableName) {
      items.push({
        key: CollapseSection.Structure,
        label: 'Structure',
        children: <StructureSection />,
      });
    }

    return items;
  }, [
    collapseActiveKeys,
    onChangeTableName,
    pivotTableWizardMode,
    selectedTableName,
    setStartCol,
    setStartRow,
    startCol,
    startRow,
    tableNameOptions,
  ]);

  const onCollapseSectionChange = useCallback((activeKeys: string[]) => {
    setCollapseActiveKeys(activeKeys as CollapseSection[]);
  }, []);

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div
        className={cx(
          'flex flex-col w-full overflow-auto thin-scrollbar bg-bg-layer-3 grow',
        )}
      >
        <div className="flex items-center justify-between gap-2 py-2">
          <h2 className="text-[13px] text-text-primary font-semibold px-4 py-2">
            {pivotTableWizardMode === 'create'
              ? 'Create Pivot Table'
              : `Edit Pivot Table: ${pivotTableName}`}
          </h2>

          {pivotTableWizardMode === 'edit' && (
            <Button
              className={cx(primaryButtonClasses, 'max-w-[200px] h-7 mx-2')}
              onClick={() => changePivotTableWizardMode(null)}
            >
              Edit Table Properties
            </Button>
          )}
        </div>

        <Collapse
          activeKey={collapseActiveKeys}
          collapsible="header"
          expandIcon={CollapseIcon}
          items={collapseItems}
          onChange={onCollapseSectionChange}
        />
      </div>
    </div>
  );
}
