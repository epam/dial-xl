import { Collapse } from 'antd';
import { CollapseProps } from 'antd/es/collapse/Collapse';
import { useCallback, useMemo, useState } from 'react';

import { ParsedTable } from '@frontend/parser';

import { CollapseIcon } from '../../Chart/Components';
import { TableNameSection, TablePlacementSection } from '../../TableDetails';
import { EditControlsSection } from './EditControlsSection';
import { ControlWizardCollapseSection, TableOption } from './utils';

type Props = {
  parsedTable: ParsedTable;
  tables: TableOption[];
};

export function EditControlWizard({ parsedTable, tables }: Props) {
  const [collapseActiveKeys, setCollapseActiveKeys] = useState<
    ControlWizardCollapseSection[]
  >([ControlWizardCollapseSection.Controls]);

  const onCollapseSectionChange = useCallback((activeKeys: string[]) => {
    setCollapseActiveKeys(activeKeys as ControlWizardCollapseSection[]);
  }, []);

  const collapseItems = useMemo((): CollapseProps['items'] => {
    return [
      {
        key: ControlWizardCollapseSection.TableName,
        label: 'Control group name',
        children: (
          <TableNameSection
            id="tableName"
            placeholder="Control group name"
            tableName={parsedTable.tableName}
          />
        ),
      },
      {
        key: ControlWizardCollapseSection.Location,
        label: 'Location',
        children: <TablePlacementSection parsedTable={parsedTable} />,
      },
      {
        key: ControlWizardCollapseSection.Controls,
        label: 'Controls',
        forceRender: true,
        children: (
          <EditControlsSection parsedTable={parsedTable} tables={tables} />
        ),
      },
    ];
  }, [parsedTable, tables]);

  return (
    <>
      <div className="flex items-center justify-between gap-2 py-2">
        <h2 className="text-[13px] text-text-primary font-semibold px-4 py-2">
          Edit Control: {parsedTable.tableName}
        </h2>
      </div>

      <Collapse
        activeKey={collapseActiveKeys}
        collapsible="header"
        destroyOnHidden={false}
        expandIcon={CollapseIcon}
        items={collapseItems}
        onChange={onCollapseSectionChange}
      />
    </>
  );
}
