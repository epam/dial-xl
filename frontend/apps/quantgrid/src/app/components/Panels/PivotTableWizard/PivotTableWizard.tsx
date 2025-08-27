import { Collapse } from 'antd';
import { CollapseProps } from 'antd/es/collapse/Collapse';
import cx from 'classnames';
import { useCallback, useContext, useMemo, useState } from 'react';

import { AppContext, ProjectContext } from '../../../context';
import { CollapseIcon } from '../Chart/Components';
import {
  PivotWizardActions,
  PositionInputs,
  StructureSection,
  TableSelector,
} from './components';
import { usePivotTableSetup } from './hooks';
import { PivotWizardContext } from './PivotWizardContext';
import { toSelectOption } from './utils';

enum CollapseSection {
  SourceTable = 'sourceTable',
  Location = 'location',
  Structure = 'structure',
}

export function PivotTableWizard() {
  const { pivotTableName, pivotTableWizardMode } = useContext(AppContext);
  const { parsedSheets } = useContext(ProjectContext);
  const { onChangeTableName, selectedTableName, startCol, startRow } =
    useContext(PivotWizardContext);

  usePivotTableSetup();

  const tableNameOptions = useMemo(() => {
    return Object.values(parsedSheets ?? {}).flatMap(({ tables }) =>
      tables.map(({ tableName }) => toSelectOption(tableName))
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
        children: <PositionInputs />,
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
          'flex flex-col w-full overflow-auto thin-scrollbar bg-bgLayer3 flex-grow'
        )}
      >
        <h2 className="text-[13px] text-textPrimary font-semibold px-4 py-2">
          {pivotTableWizardMode === 'create'
            ? 'Create Pivot Table'
            : `Edit Pivot Table: ${pivotTableName}`}
        </h2>

        <Collapse
          activeKey={collapseActiveKeys}
          collapsible="header"
          expandIcon={CollapseIcon}
          items={collapseItems}
          onChange={onCollapseSectionChange}
        />
      </div>

      <PivotWizardActions />
    </div>
  );
}
