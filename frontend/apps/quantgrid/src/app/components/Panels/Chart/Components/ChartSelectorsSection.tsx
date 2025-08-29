import { Input, Tooltip } from 'antd';
import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import {
  MouseEventHandler,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import Select, { SingleValue } from 'react-select';

import Icon from '@ant-design/icons';
import {
  inputClasses,
  isComplexType,
  SelectClasses,
  selectStyles,
  TrashIcon,
} from '@frontend/common';
import {
  chartSelectorDecoratorName,
  ParsedField,
  ParsedTable,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
  ViewportContext,
} from '../../../../context';
import { useFieldEditDsl } from '../../../../hooks';
import { ChartEmptySection } from './ChartEmptySection';
import { ChartPanelSelectClasses } from './SelectUtils';

type Props = {
  parsedTable: ParsedTable;
  isAddingSelector: boolean;
  onRemoveNewSelector: () => void;
};

export function ChartSelectorsSection({
  parsedTable,
  isAddingSelector,
  onRemoveNewSelector,
}: Props) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { viewGridData } = useContext(ViewportContext);
  const { sheetName } = useContext(ProjectContext);
  const { removeFieldDecorator, setFieldDecorator } = useFieldEditDsl();
  const [selectors, setSelectors] = useState<ParsedField[]>([]);
  const [notUsedSelectors, setNotUsedSelectors] = useState<ParsedField[]>([]);
  const [selectedNewSelector, setSelectedNewSelector] =
    useState<SingleValue<DefaultOptionType>>();

  const handleRemoveSelector = useCallback(
    (selector: ParsedField) => {
      if (!sheetName) return;
      const { tableName } = parsedTable;
      const { fieldName } = selector.key;
      const historyTitle = `Remove selector ${tableName}[${fieldName}]`;
      removeFieldDecorator(
        tableName,
        fieldName,
        chartSelectorDecoratorName,
        historyTitle
      );
      openTable(sheetName, tableName);
    },
    [openTable, parsedTable, removeFieldDecorator, sheetName]
  );

  const handleSelectNewSelector = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      if (!option || !sheetName) return;

      const field = parsedTable.fields.find(
        (f) => f.key.fieldName === option.value
      );

      if (!field) return;

      setSelectedNewSelector(null);

      const { tableName } = parsedTable;
      const { fieldName } = field.key;
      const historyTitle = `Add selector to ${tableName}[${fieldName}]`;

      setFieldDecorator(
        tableName,
        fieldName,
        chartSelectorDecoratorName,
        '',
        historyTitle
      );

      openTable(sheetName, tableName);
    },
    [setFieldDecorator, openTable, parsedTable, sheetName]
  );

  const handleRemoveNewSelector = useCallback(() => {
    setSelectedNewSelector(null);
    onRemoveNewSelector();
  }, [onRemoveNewSelector]);

  useEffect(() => {
    const currentSelectors: ParsedField[] = [];
    const currentNotUsedSelectors: ParsedField[] = [];
    const tableData = viewGridData.getTableData(parsedTable.tableName);
    const { types, nestedColumnNames } = tableData;

    parsedTable.fields.forEach((f) => {
      if (f.isChartSelector()) {
        currentSelectors.push(f);
      } else {
        const type = types[f.key.fieldName];
        const isNested = nestedColumnNames.has(f.key.fieldName);
        const isComplex = isComplexType({ type, isNested });
        const isXAxis = f.isChartXAxis();
        const isDotColor = f.isChartDotColor();
        const isDotSize = f.isChartDotSize();

        if (
          !isXAxis &&
          !isDotColor &&
          !isDotSize &&
          !f.isDynamic &&
          !isComplex
        ) {
          currentNotUsedSelectors.push(f);
        }
      }
    });

    setSelectors(
      currentSelectors.sort((a, b) =>
        a.key.fieldName.localeCompare(b.key.fieldName)
      )
    );
    setNotUsedSelectors(currentNotUsedSelectors);
  }, [parsedTable, viewGridData]);

  return (
    <div className="flex flex-col">
      {selectors.map((selector) => (
        <div className="flex items-center mb-2" key={selector.key.fieldName}>
          <Input
            className={cx('h-7 text-[13px] !text-textPrimary', inputClasses)}
            id="selectorFieldName"
            value={selector.key.fieldName}
            disabled
          />
          <RemoveButton onClick={() => handleRemoveSelector(selector)} />
        </div>
      ))}
      {isAddingSelector && (
        <div className="flex items-center mb-2">
          <Select
            classNames={{
              ...SelectClasses,
              ...ChartPanelSelectClasses,
            }}
            components={{
              IndicatorSeparator: null,
            }}
            isSearchable={true}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            name="newSelectorFieldName"
            options={notUsedSelectors.map((f) => ({
              value: f.key.fieldName,
              label: f.key.fieldName,
            }))}
            styles={selectStyles}
            value={selectedNewSelector}
            onChange={handleSelectNewSelector}
          />
          <RemoveButton onClick={handleRemoveNewSelector} />
        </div>
      )}
      {selectors.length === 0 && !isAddingSelector && (
        <ChartEmptySection message="No selectors added" />
      )}
    </div>
  );
}

function RemoveButton({
  onClick,
}: {
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <Tooltip placement="top" title="Remove Selector">
      <button className="flex items-center" onClick={onClick}>
        <Icon
          className="w-[18px] ml-2 text-textSecondary hover:text-textAccentPrimary"
          component={() => <TrashIcon />}
        />
      </button>
    </Tooltip>
  );
}
