import { Dropdown, Tooltip } from 'antd';
import classNames from 'classnames';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  ChevronDown,
  ColumnFormat,
  CommaIcon,
  DecimalLeftIcon,
  DecimalRightIcon,
  FormatKeys,
  FormatKeysMap,
  FormatLabel,
  isComplexType,
  MenuItem,
  PercentageIcon,
} from '@frontend/common';
import { formatDecoratorName } from '@frontend/parser';

import { ProjectContext } from '../../context';
import { useDSLUtils, useGridApi } from '../../hooks';
import {
  CurrencyKeyData,
  FormatKeyData,
  NumberKeyData,
} from '../../types/format';
import { getFormatsItems } from './FormatsItems';
import { useOnFormatClick } from './useOnFormatClick';

export const Formats = () => {
  const api = useGridApi();
  const { findTable } = useDSLUtils();

  const { selectedCell } = useContext(ProjectContext);
  const [selectedFormat, setSelectedFormat] = useState(FormatKeys.General);
  const [selectedFormatParams, setSelectedFormatParams] =
    useState<FormatKeyData>();
  const [selectedFormatExplicit, setSelectedFormatExplicit] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  const selectedCellValue = useMemo(() => {
    if (!selectedCell) return undefined;

    const cell = api?.getCell(selectedCell.col, selectedCell.row);

    if (!cell) return undefined;

    return (
      (cell.value &&
        cell.field?.fieldName &&
        cell.table?.tableName &&
        !cell.isFieldHeader &&
        cell.value) ||
      undefined
    );
  }, [api, selectedCell]);

  const items: MenuItem[] = useMemo(
    () => getFormatsItems(selectedCellValue ?? '', selectedFormatExplicit),
    [selectedCellValue, selectedFormatExplicit]
  );

  const isCommaSelected = useMemo(
    () => (selectedFormatParams as NumberKeyData)?.thousandComma ?? false,
    [selectedFormatParams]
  );
  const isPercentageSelected = selectedFormat === FormatKeys.Percentage;

  const { onFormatClick } = useOnFormatClick();

  const handleItemClick = useCallback(
    (info: MenuInfo) => {
      const parsedKey = JSON.parse(info.key);
      const action: string = parsedKey.action;
      const data: FormatKeyData = parsedKey.data;

      setSelectedFormat(action);

      onFormatClick(action, data);
    },
    [onFormatClick]
  );

  const handlePercentageSelect = useCallback(() => {
    if (selectedFormat === FormatKeys.Percentage) {
      onFormatClick(FormatKeys.General, {});

      return;
    }

    onFormatClick(FormatKeys.Percentage, { decimalAmount: 1 } as NumberKeyData);
  }, [onFormatClick, selectedFormat]);

  const handleCommaSelect = useCallback(() => {
    const typedSelectedFormat = selectedFormatParams as
      | NumberKeyData
      | CurrencyKeyData
      | undefined;
    const newCommaValue = !isCommaSelected;

    if (
      ![FormatKeys.Number, FormatKeys.Currency].includes(selectedFormat) ||
      !selectedFormatParams
    ) {
      onFormatClick(FormatKeys.Number, {
        decimalAmount: typedSelectedFormat?.decimalAmount ?? 1,
        thousandComma: newCommaValue,
      } as NumberKeyData);

      return;
    }

    if (selectedFormat === FormatKeys.Number) {
      onFormatClick(FormatKeys.Number, {
        decimalAmount: (selectedFormatParams as NumberKeyData).decimalAmount,
        thousandComma: newCommaValue,
      } as NumberKeyData);

      return;
    }
    if (selectedFormat === FormatKeys.Currency) {
      onFormatClick(FormatKeys.Currency, {
        decimalAmount: (selectedFormatParams as NumberKeyData).decimalAmount,
        currencySymbol: (selectedFormatParams as CurrencyKeyData)
          .currencySymbol,
        thousandComma: newCommaValue,
      } as CurrencyKeyData);

      return;
    }
  }, [isCommaSelected, onFormatClick, selectedFormat, selectedFormatParams]);

  const handleDecimalChange = useCallback(
    (change: number) => {
      if (
        ![
          FormatKeys.Number,
          FormatKeys.Scientific,
          FormatKeys.Currency,
          FormatKeys.Percentage,
        ].includes(selectedFormat) ||
        !selectedFormatParams
      ) {
        onFormatClick(FormatKeys.Number, {
          thousandComma: true,
          decimalAmount: 1,
        } as NumberKeyData);

        return;
      }
      const newDecimalAmount = Math.max(
        0,
        ((selectedFormatParams as NumberKeyData).decimalAmount ?? 0) + change
      );

      if (selectedFormat === FormatKeys.Number) {
        onFormatClick(FormatKeys.Number, {
          thousandComma: (selectedFormatParams as NumberKeyData).thousandComma,
          decimalAmount: newDecimalAmount,
        } as NumberKeyData);

        return;
      }
      if (selectedFormat === FormatKeys.Scientific) {
        onFormatClick(FormatKeys.Scientific, {
          decimalAmount: newDecimalAmount,
        } as NumberKeyData);

        return;
      }
      if (selectedFormat === FormatKeys.Currency) {
        onFormatClick(FormatKeys.Currency, {
          decimalAmount: newDecimalAmount,
          currencySymbol: (selectedFormatParams as CurrencyKeyData)
            .currencySymbol,
          thousandComma: true,
        } as CurrencyKeyData);

        return;
      }
      if (selectedFormat === FormatKeys.Percentage) {
        onFormatClick(FormatKeys.Percentage, {
          decimalAmount: newDecimalAmount,
        } as NumberKeyData);

        return;
      }
    },
    [onFormatClick, selectedFormat, selectedFormatParams]
  );

  const updateFormatInfo = useCallback(
    (
      inheritedFormat: ColumnFormat | undefined,
      tableName: string,
      fieldName: string
    ) => {
      const targetTable = findTable(tableName);

      if (!targetTable) {
        setSelectedFormat(FormatKeys.General);

        return;
      }

      const targetField = targetTable.fields.find(
        (field) => field.key.fieldName === fieldName
      );
      if (!targetField?.span) {
        setSelectedFormat(FormatKeys.General);

        return;
      }

      const existingFormatDecorator = targetField.decorators?.find(
        (dec) => dec.decoratorName === formatDecoratorName
      );
      const params = existingFormatDecorator?.params ?? [];
      let dslFormat: string | undefined;
      let dslArgs: string[] | undefined;

      if (params.length > 0) {
        const [dslParamsFormat, ...dslParamsArgs] = params[0];
        dslFormat = dslParamsFormat;
        dslArgs = dslParamsArgs;
      } else if (!inheritedFormat) {
        setSelectedFormat(FormatKeys.General);

        return;
      }

      if (!dslFormat && !inheritedFormat) {
        setSelectedFormat(FormatKeys.General);

        return;
      }

      const formatName = dslFormat ?? FormatKeysMap[inheritedFormat!.type];
      const args =
        dslArgs ??
        ([
          inheritedFormat?.currencyArgs?.format,
          inheritedFormat?.currencyArgs?.useThousandsSeparator,
          inheritedFormat?.currencyArgs?.symbol,
          inheritedFormat?.dateArgs?.pattern,
          inheritedFormat?.numberArgs?.format,
          inheritedFormat?.numberArgs?.useThousandsSeparator,
          inheritedFormat?.percentageArgs?.format,
          inheritedFormat?.scientificArgs?.format,
        ].filter(Boolean) as any[]);
      setSelectedFormatExplicit(!!dslFormat);
      setSelectedFormat(formatName);

      switch (formatName) {
        case FormatKeys.General:
        case FormatKeys.Text:
          setSelectedFormatParams(undefined);
          break;
        case FormatKeys.Number:
          setSelectedFormatParams({
            decimalAmount: args[0],
            thousandComma: !!args[1],
          });
          break;
        case FormatKeys.Scientific:
          setSelectedFormatParams({
            decimalAmount: args[0],
          });
          break;
        case FormatKeys.Currency:
          setSelectedFormatParams({
            decimalAmount: args[0],
            thousandComma: !!args[1],
            currencySymbol: args[2],
          });
          break;
        case FormatKeys.Date:
          setSelectedFormatParams({
            patternDate: args[0],
          });
          break;
        case FormatKeys.Percentage:
          setSelectedFormatParams({
            decimalAmount: args[0],
          });
          break;
      }
    },
    [findTable]
  );

  useEffect(() => {
    const subscription = api?.selection$.subscribe((newSelection) => {
      if (!newSelection) {
        setIsDisabled(true);
        setSelectedFormat(FormatKeys.General);

        return;
      }

      const cell = api.getCell(newSelection.startCol, newSelection.startRow);

      if (!cell?.table || !cell.field || isComplexType(cell.field)) {
        setIsDisabled(true);
        setSelectedFormat(FormatKeys.General);

        return;
      }

      setIsDisabled(false);
      updateFormatInfo(
        cell.field.format,
        cell.table.tableName,
        cell.field.fieldName
      );
    });

    return () => subscription?.unsubscribe();
  }, [api, api?.selection$, updateFormatInfo]);

  return (
    <div className="flex h-full">
      <div className="border-x border-strokeTertiary w-28 md:w-36">
        <Tooltip
          className={classNames(isDisabled && 'cursor-not-allowed')}
          title={
            isDisabled
              ? 'Select table column cell to being able to set format'
              : 'Select format'
          }
        >
          <div className="h-7">
            <Dropdown
              autoAdjustOverflow={true}
              autoFocus={true}
              className={classNames(isDisabled && 'text-controlsTextDisable')}
              destroyPopupOnHide={true}
              disabled={isDisabled}
              forceRender={true}
              menu={{
                items: items,
                onClick: handleItemClick,
              }}
              trigger={['click']}
            >
              <div
                className={classNames(
                  'h-full px-3 flex items-center justify-between'
                )}
              >
                <span className="text-sm">{FormatLabel[selectedFormat]}</span>
                <Icon
                  className="h-[18px] w-[18px] shrink-0 group-focus:rotate-180"
                  component={() => <ChevronDown />}
                ></Icon>
              </div>
            </Dropdown>
          </div>
        </Tooltip>
      </div>

      <div className="hidden md:flex gap-2 px-3 py-1">
        <Tooltip
          title={
            isDisabled
              ? 'Select table column cell to being able to set format'
              : 'Use percentage format'
          }
        >
          <button
            className={classNames(
              'h-[18px] flex items-center enabled:hover:text-textAccentPrimary disabled:text-controlsTextDisable disabled:cursor-not-allowed',
              isPercentageSelected
                ? 'text-textAccentPrimary'
                : 'text-textSecondary'
            )}
            disabled={isDisabled}
            onClick={handlePercentageSelect}
          >
            <Icon
              className="h-[18px] w-[18px] shrink-0"
              component={() => <PercentageIcon />}
            ></Icon>
          </button>
        </Tooltip>
        <Tooltip
          title={
            isDisabled
              ? 'Select table column cell to being able to set format'
              : 'Use thousand comma'
          }
        >
          <button
            className={classNames(
              'h-[18px] flex items-center enabled:hover:text-textAccentPrimary disabled:text-controlsTextDisable disabled:cursor-not-allowed',
              isCommaSelected ? 'text-textAccentPrimary' : 'text-textSecondary'
            )}
            disabled={isDisabled}
            onClick={handleCommaSelect}
          >
            <Icon
              className="h-[18px] w-[18px] shrink-0"
              component={() => <CommaIcon />}
            ></Icon>
          </button>
        </Tooltip>
        <Tooltip
          title={
            isDisabled
              ? 'Select table column cell to being able to set format'
              : 'Reduce decimal amount'
          }
        >
          <button
            className="h-[18px] flex items-center text-textSecondary enabled:hover:text-textAccentPrimary disabled:text-controlsTextDisable disabled:cursor-not-allowed"
            disabled={isDisabled}
            onClick={() => handleDecimalChange(-1)}
          >
            <Icon
              className="h-[18px] w-[18px] shrink-0"
              component={() => <DecimalLeftIcon />}
            ></Icon>
          </button>
        </Tooltip>
        <Tooltip
          title={
            isDisabled
              ? 'Select table column cell to being able to set format'
              : 'Increase decimal amount'
          }
        >
          <button
            className="h-[18px] flex items-center text-textSecondary enabled:hover:text-textAccentPrimary disabled:text-controlsTextDisable disabled:cursor-not-allowed"
            disabled={isDisabled}
            onClick={() => handleDecimalChange(1)}
          >
            <Icon
              className="h-[18px] w-[18px] shrink-0"
              component={() => <DecimalRightIcon />}
            ></Icon>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
