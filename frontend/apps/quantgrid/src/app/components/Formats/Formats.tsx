import { Dropdown, Tooltip } from 'antd';
import classNames from 'classnames';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  ChevronDown,
  CommaIcon,
  DecimalLeftIcon,
  DecimalRightIcon,
  MenuItem,
  PercentageIcon,
} from '@frontend/common';
import { formatDecoratorName } from '@frontend/parser';

import { useDSLUtils, useGridApi } from '../../hooks';
import {
  CurrencyKeyData,
  FormatKeyData,
  NumberKeyData,
} from '../../types/format';
import { FormatKeys, FormatLabel } from '../../utils';
import { getFormatsItems } from './FormatsItems';
import { useOnFormatClick } from './useOnFormatClick';

export const Formats = () => {
  const api = useGridApi();
  const { findTable } = useDSLUtils();

  const [selectedFormat, setSelectedFormat] = useState(FormatKeys.General);
  const [selectedFormatParams, setSelectedFormatParams] =
    useState<FormatKeyData>();
  const [isDisabled, setIsDisabled] = useState(false);

  const items: MenuItem[] = useMemo(() => {
    return getFormatsItems();
  }, []);

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
    if (selectedFormat === FormatKeys.Percentage) return;

    onFormatClick(FormatKeys.Percentage, { decimalAmount: 1 } as NumberKeyData);
  }, [onFormatClick, selectedFormat]);

  const handleCommaSelect = useCallback(() => {
    if (
      ![FormatKeys.Integer, FormatKeys.Number, FormatKeys.Currency].includes(
        selectedFormat
      ) ||
      !selectedFormatParams
    ) {
      onFormatClick(FormatKeys.Integer, {
        thousandComma: true,
      } as NumberKeyData);

      return;
    }

    if (selectedFormat === FormatKeys.Integer) {
      onFormatClick(FormatKeys.Integer, {
        thousandComma: true,
      } as NumberKeyData);

      return;
    }
    if (selectedFormat === FormatKeys.Number) {
      onFormatClick(FormatKeys.Number, {
        decimalAmount: (selectedFormatParams as NumberKeyData).decimalAmount,
        thousandComma: true,
      } as NumberKeyData);

      return;
    }
    if (selectedFormat === FormatKeys.Currency) {
      onFormatClick(FormatKeys.Currency, {
        decimalAmount: (selectedFormatParams as NumberKeyData).decimalAmount,
        currencyCode: (selectedFormatParams as CurrencyKeyData).currencySymbol,
        thousandComma: true,
      } as NumberKeyData);

      return;
    }
  }, [onFormatClick, selectedFormat, selectedFormatParams]);

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
          currencyCode: (selectedFormatParams as CurrencyKeyData)
            .currencySymbol,
          thousandComma: true,
        } as NumberKeyData);

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
    (tableName: string, fieldName: string) => {
      const targetTable = findTable(tableName);

      if (!targetTable) {
        setSelectedFormat(FormatKeys.General);

        return;
      }

      const targetField = targetTable.fields.find(
        (field) => field.key.fieldName === fieldName
      );

      if (!targetField?.dslFieldNamePlacement) {
        setSelectedFormat(FormatKeys.General);

        return;
      }

      const existingFormatDecorator = targetField.decorators?.find(
        (dec) => dec.decoratorName === formatDecoratorName
      );

      const params = existingFormatDecorator?.params ?? [];

      if (!params.length) {
        setSelectedFormat(FormatKeys.General);

        return;
      }

      const [format, ...args] = params[0];

      setSelectedFormat(format);

      switch (format) {
        case FormatKeys.General:
        case FormatKeys.Text:
          break;
        case FormatKeys.Integer:
          setSelectedFormatParams({
            thousandComma: args[0],
          });
          break;
        case FormatKeys.Number:
          setSelectedFormatParams({
            decimalAmount: args[0],
            thousandComma: args[1],
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
            thousandComma: args[1],
            currencySymbol: args[2],
          });
          break;
        case FormatKeys.Date:
          setSelectedFormatParams({
            patternDate: args[0],
          });
          break;
        case FormatKeys.Time:
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

      if (!cell?.table || !cell.field) {
        setIsDisabled(true);
        setSelectedFormat(FormatKeys.General);

        return;
      }

      setIsDisabled(false);
      updateFormatInfo(cell.table.tableName, cell.field.fieldName);
    });

    return () => subscription?.unsubscribe();
  }, [api, api?.selection$, updateFormatInfo]);

  return (
    <div className="flex h-full">
      <div className="border-x border-strokeTertiary w-36">
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
              className={classNames(isDisabled && 'text-textSecondary')}
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

      <div className="flex gap-2 px-3 py-1">
        <Tooltip
          title={
            isDisabled
              ? 'Select table column cell to being able to set format'
              : 'Use percentage format'
          }
        >
          <button
            className="h-[18px] flex items-center text-textSecondary enabled:hover:text-textAccentPrimary disabled:cursor-not-allowed"
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
            className="h-[18px] flex items-center text-textSecondary enabled:hover:text-textAccentPrimary disabled:cursor-not-allowed"
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
            className="h-[18px] flex items-center text-textSecondary enabled:hover:text-textAccentPrimary disabled:cursor-not-allowed"
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
            className="h-[18px] flex items-center text-textSecondary enabled:hover:text-textAccentPrimary disabled:cursor-not-allowed"
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
