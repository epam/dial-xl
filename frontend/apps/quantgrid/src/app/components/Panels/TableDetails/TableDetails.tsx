import { Button, Collapse } from 'antd';
import { CollapseProps } from 'antd/es/collapse/Collapse';
import cx from 'classnames';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { primaryButtonClasses } from '@frontend/common';
import { ParsedTable } from '@frontend/parser';

import { AppContext } from '../../../context';
import { CollapseIcon } from '../Chart/Components';
import {
  TableFieldsSection,
  TableHeadersSection,
  TableNameSection,
  TableOrientationSection,
  TablePlacementSection,
} from './components';

enum CollapseSection {
  Name = 'name',
  Location = 'location',
  Orientation = 'orientation',
  Headers = 'headers',
  Columns = 'columns',
}

const storageKey = 'tableDetailsCollapseSections';
const defaultSections: CollapseSection[] = [CollapseSection.Name];

export function TableDetails({ parsedTable }: { parsedTable: ParsedTable }) {
  const { changePivotTableWizardMode } = useContext(AppContext);
  const [collapseActiveKeys, setCollapseActiveKeys] = useState<
    CollapseSection[]
  >(() => {
    try {
      const raw = localStorage.getItem(storageKey);

      return raw ? (JSON.parse(raw) as CollapseSection[]) : defaultSections;
    } catch {
      return defaultSections;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(collapseActiveKeys));
    } catch {
      // empty section
    }
  }, [collapseActiveKeys]);

  const collapseItems = useMemo((): CollapseProps['items'] => {
    return [
      {
        key: CollapseSection.Name,
        label: 'Title',
        children: (
          <TableNameSection
            id="tableName"
            placeholder="Table name"
            tableName={parsedTable.tableName}
          />
        ),
      },
      {
        key: CollapseSection.Location,
        label: 'Location',
        children: <TablePlacementSection parsedTable={parsedTable} />,
      },
      {
        key: CollapseSection.Orientation,
        label: 'Orientation',
        children: <TableOrientationSection parsedTable={parsedTable} />,
      },
      {
        key: CollapseSection.Headers,
        label: 'Headers',
        children: <TableHeadersSection parsedTable={parsedTable} />,
      },
      {
        key: CollapseSection.Columns,
        label: 'Columns',
        children: <TableFieldsSection parsedTable={parsedTable} />,
      },
    ];
  }, [parsedTable]);

  const onCollapseSectionChange = useCallback((activeKeys: string[]) => {
    setCollapseActiveKeys(activeKeys as CollapseSection[]);
  }, []);

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div
        className={cx(
          'flex flex-col w-full overflow-auto thin-scrollbar bg-bg-layer-3 grow'
        )}
      >
        <div className="flex items-center justify-between gap-2 py-2">
          <h2 className="text-[13px] text-text-primary font-semibold px-4 py-2">
            Edit Table: {parsedTable.tableName}
          </h2>

          {parsedTable.isPivot && (
            <Button
              className={cx(primaryButtonClasses, 'max-w-[200px] h-7 mx-2')}
              onClick={() =>
                changePivotTableWizardMode('edit', parsedTable.tableName)
              }
            >
              Open Pivot Wizard
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
