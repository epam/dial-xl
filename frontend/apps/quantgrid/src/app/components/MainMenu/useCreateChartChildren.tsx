import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  chartItems,
  getDropdownItem,
  getDropdownMenuKey,
  InsertChartContextMenuKeyData,
} from '@frontend/common/lib';
import { ParsedSheets } from '@frontend/parser';

export const useCreateChartChildren = ({
  parsedSheets,
  basePath,
}: {
  parsedSheets: ParsedSheets;
  basePath: string[];
}) => {
  const chartChildren = useMemo(() => {
    let tableNames: string[] = [];
    for (const sheet of Object.values(parsedSheets)) {
      tableNames = tableNames.concat(
        [...sheet.tables.map((table) => table.tableName)].sort(),
      );
    }

    return [
      ...chartItems.map(({ label, icon, type }) => {
        const chartTypePath = [...basePath, type];

        return getDropdownItem({
          label: label,
          fullPath: chartTypePath,
          key: getDropdownMenuKey(`insertChart-${type}`),
          icon: (
            <Icon
              className="text-text-secondary w-[18px]"
              component={() => icon}
            />
          ),
          children: tableNames?.map((name) =>
            getDropdownItem({
              label: name,
              fullPath: [...chartTypePath, name],
              key: getDropdownMenuKey<InsertChartContextMenuKeyData>(
                ['Action', 'Chart', name, type].join('-'),
                {
                  chartType: type,
                  tableName: name,
                },
              ),
            }),
          ),
        });
      }),
    ];
  }, [parsedSheets, basePath]);

  return {
    chartChildren,
  };
};
