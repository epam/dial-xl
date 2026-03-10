import { Button, Collapse } from 'antd';
import { CollapseProps } from 'antd/es/collapse/Collapse';
import cx from 'classnames';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { primaryButtonClasses } from '@frontend/common';

import { ProjectContext } from '../../../context';
import { useGroupByStore } from '../../../store';
import { CollapseIcon } from '../Chart/Components';
import { PositionInputs, TableSelector, toSelectOption } from '../Shared';
import { StructureSection } from './components';
import { GroupByWizardContext } from './context';
import { useGroupByTableSetup } from './hooks';

enum CollapseSection {
  SourceTable = 'sourceTable',
  Location = 'location',
  Structure = 'structure',
}

export function GroupByTableWizard() {
  const {
    groupByTableName,
    groupByTableWizardMode,
    changeGroupByTableWizardMode,
  } = useGroupByStore(
    useShallow((s) => ({
      groupByTableName: s.groupByTableName,
      groupByTableWizardMode: s.groupByTableWizardMode,
      changeGroupByTableWizardMode: s.changeGroupByTableWizardMode,
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
  } = useContext(GroupByWizardContext);

  useGroupByTableSetup();

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
            inputName="groupBySourceTableName"
            selectedTableName={selectedTableName}
            tableNameOptions={tableNameOptions}
            onTableChange={onChangeTableName}
          />
        ),
      },
    ];

    if (selectedTableName && groupByTableWizardMode === 'create') {
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
    selectedTableName,
    tableNameOptions,
    onChangeTableName,
    groupByTableWizardMode,
    collapseActiveKeys,
    startRow,
    startCol,
    setStartCol,
    setStartRow,
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
            {groupByTableWizardMode === 'create'
              ? 'Create GroupBy Table'
              : `Edit GroupBy Table: ${groupByTableName}`}
          </h2>

          {groupByTableWizardMode === 'edit' && (
            <Button
              className={cx(primaryButtonClasses, 'max-w-[200px] h-7 mx-2')}
              onClick={() => changeGroupByTableWizardMode(null)}
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
