import { Button } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import cx from 'classnames';
import { useCallback, useContext, useMemo, useState } from 'react';
import { SingleValue } from 'react-select';

import Icon from '@ant-design/icons';
import {
  primaryButtonClasses,
  SelectAllIcon,
  TableHeaderIcon,
  TableIcon,
} from '@frontend/common';

import { ProjectContext } from '../../../../context';
import {
  useControlStore,
  useGroupByStore,
  usePivotStore,
} from '../../../../store';
import { TableSelector, toSelectOption } from '../../Shared';

export function DetailsPanelInitialView() {
  const changePivotTableWizardMode = usePivotStore(
    (s) => s.changePivotTableWizardMode,
  );
  const changeGroupByTableWizardMode = useGroupByStore(
    (s) => s.changeGroupByTableWizardMode,
  );
  const openControlCreateWizard = useControlStore(
    (s) => s.openControlCreateWizard,
  );
  const { parsedSheets } = useContext(ProjectContext);
  const [selectedPivotTableName, setSelectedPivotTableName] =
    useState<DefaultOptionType>();
  const [selectedGroupByTableName, setSelectedGroupByTableName] =
    useState<DefaultOptionType>();

  const tableNameOptions = useMemo(() => {
    return Object.values(parsedSheets ?? {}).flatMap(({ tables }) =>
      tables.map(({ tableName }) => toSelectOption(tableName)),
    );
  }, [parsedSheets]);

  const onChangePivotTableName = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      if (!option) return;
      setSelectedPivotTableName(option);
    },
    [],
  );

  const onChangeGroupByTableName = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      if (!option) return;
      setSelectedGroupByTableName(option);
    },
    [],
  );

  const onOpenPivotWizard = useCallback(() => {
    if (!selectedPivotTableName) return;

    changePivotTableWizardMode(
      'create',
      selectedPivotTableName.value as string,
    );
  }, [changePivotTableWizardMode, selectedPivotTableName]);

  const onOpenGroupByWizard = useCallback(() => {
    if (!selectedGroupByTableName) return;

    changeGroupByTableWizardMode(
      'create',
      selectedGroupByTableName.value as string,
    );
  }, [changeGroupByTableWizardMode, selectedGroupByTableName]);

  const onOpenControlWizard = useCallback(() => {
    openControlCreateWizard();
  }, [openControlCreateWizard]);

  return (
    <div className="max-w-[370px] self-center grow justify-center flex flex-col items-center pb-1 px-4">
      <Icon
        className="w-10 text-text-accent-primary mb-4"
        component={() => (
          <TableHeaderIcon secondaryAccentCssVar="text-bgAccentPrimaryAlphaRGB" />
        )}
      />
      <span className="text-[13px] font-semibold text-text-primary text-center">
        Select an existing chart or table to see details
      </span>

      <Divider />

      <Icon
        className="w-10 text-text-secondary mb-4"
        component={() => <TableIcon />}
      />
      <span className="text-[13px] font-semibold text-text-primary text-center">
        Create Pivot table
      </span>

      <div className="flex justify-center w-full mt-4">
        <div className="w-3/4">
          <TableSelector
            inputName="pivotSourceTableName"
            selectedTableName={selectedPivotTableName}
            tableNameOptions={tableNameOptions}
            onTableChange={onChangePivotTableName}
          />
        </div>
        <Button
          className={cx(primaryButtonClasses, 'h-full ml-2')}
          onClick={onOpenPivotWizard}
        >
          Next
        </Button>
      </div>

      <Divider />

      <Icon
        className="w-10 text-text-secondary mb-4"
        component={() => <TableIcon />}
      />
      <span className="text-[13px] font-semibold text-text-primary text-center">
        Create GroupBy table
      </span>

      <div className="flex justify-center w-full mt-4">
        <div className="w-3/4">
          <TableSelector
            inputName="groupBySourceTableName"
            selectedTableName={selectedGroupByTableName}
            tableNameOptions={tableNameOptions}
            onTableChange={onChangeGroupByTableName}
          />
        </div>
        <Button
          className={cx(primaryButtonClasses, 'h-full ml-2')}
          onClick={onOpenGroupByWizard}
        >
          Next
        </Button>
      </div>

      <Divider />

      <Icon
        className="w-10 text-text-accent-primary mb-4"
        component={() => <SelectAllIcon />}
      />

      <div className="flex justify-center w-full">
        <Button
          className={cx(primaryButtonClasses, 'h-9')}
          onClick={onOpenControlWizard}
        >
          Create Control
        </Button>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center w-full text-sm text-text-secondary my-10">
      <div className="grow border-t border-stroke-primary"></div>
      <span className="px-3">OR</span>
      <div className="grow border-t border-stroke-primary"></div>
    </div>
  );
}
