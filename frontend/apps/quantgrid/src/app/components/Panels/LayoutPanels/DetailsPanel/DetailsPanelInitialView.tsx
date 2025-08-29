import { Button } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import cx from 'classnames';
import { useCallback, useContext, useMemo, useState } from 'react';
import { SingleValue } from 'react-select';

import Icon from '@ant-design/icons';
import {
  primaryButtonClasses,
  TableHeaderIcon,
  TableIcon,
} from '@frontend/common';

import { AppContext, ProjectContext } from '../../../../context';
import { TableSelector } from '../../PivotTableWizard/components/TableSelector';
import { toSelectOption } from '../../PivotTableWizard/utils';

export function DetailsPanelInitialView() {
  const { changePivotTableWizardMode } = useContext(AppContext);
  const { parsedSheets } = useContext(ProjectContext);
  const [selectedTableName, setSelectedTableName] =
    useState<DefaultOptionType>();

  const tableNameOptions = useMemo(() => {
    return Object.values(parsedSheets ?? {}).flatMap(({ tables }) =>
      tables.map(({ tableName }) => toSelectOption(tableName))
    );
  }, [parsedSheets]);

  const onChangeTableName = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      if (!option) return;
      setSelectedTableName(option);
    },
    []
  );

  const onOpenPivotWizard = useCallback(() => {
    if (!selectedTableName) return;

    changePivotTableWizardMode('create', selectedTableName.value as string);
  }, [changePivotTableWizardMode, selectedTableName]);

  return (
    <div className="max-w-[370px] self-center grow justify-center flex flex-col items-center pb-1 px-4">
      <Icon
        className="w-10 text-textAccentPrimary mb-4"
        component={() => (
          <TableHeaderIcon secondaryAccentCssVar="text-bgAccentPrimaryAlphaRGB" />
        )}
      />
      <span className="text-[13px] font-semibold text-textPrimary text-center">
        Select an existing chart or Pivot table to see details
      </span>

      <div className="flex items-center w-full text-sm text-textSecondary my-10">
        <div className="flex-grow border-t border-strokePrimary"></div>
        <span className="px-3">OR</span>
        <div className="flex-grow border-t border-strokePrimary"></div>
      </div>

      <Icon
        className="w-10 text-textSecondary mb-4"
        component={() => <TableIcon />}
      />
      <span className="text-[13px] font-semibold text-textPrimary text-center">
        Create Pivot table
      </span>

      <div className="flex justify-center w-full mt-4">
        <div className="w-3/4">
          <TableSelector
            selectedTableName={selectedTableName}
            tableNameOptions={tableNameOptions}
            onTableChange={onChangeTableName}
          />
        </div>
        <Button
          className={cx(primaryButtonClasses, 'h-full ml-2')}
          onClick={onOpenPivotWizard}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
