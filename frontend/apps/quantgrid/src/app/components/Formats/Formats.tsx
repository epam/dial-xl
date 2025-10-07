import { Dropdown, Tooltip } from 'antd';
import classNames from 'classnames';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  ChevronDown,
  ColumnFormat,
  CommaIcon,
  DecimalDigitsIcon,
  DecimalLeftIcon,
  DecimalRightIcon,
  DigitsIcon,
  DigitsLeftIcon,
  DigitsModeKeys,
  DigitsRightIcon,
  FormatKeys,
  FormatKeysMap,
  FormatLabel,
  isComplexType,
  KMBIcon,
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
import { getDigitsModeItems, getFormatsItems } from './FormatsItems';
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
  const [isDigitsModeMenuOpened, setIsDigitsModeMenuOpened] = useState(false);

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

  const digitsModeItems = useMemo(() => {
    return getDigitsModeItems();
  }, []);

  const isCommaSelected = useMemo(
    () => (selectedFormatParams as NumberKeyData)?.thousandComma ?? false,
    [selectedFormatParams]
  );
  const isPercentageSelected = selectedFormat === FormatKeys.Percentage;
  const isDecimalDigitsSelected = useMemo(() => {
    const typedParams = selectedFormatParams as NumberKeyData;

    return typedParams?.digitsAmount && typedParams.digitsAmount >= 0;
  }, [selectedFormatParams]);
  const isSignificantDigitsSelected = useMemo(() => {
    const typedParams = selectedFormatParams as NumberKeyData;

    return typedParams?.digitsAmount && typedParams.digitsAmount < 0;
  }, [selectedFormatParams]);
  const isCompactDigitsSelected = useMemo(() => {
    const typedParams = selectedFormatParams as NumberKeyData;

    return !!typedParams?.compactFormat;
  }, [selectedFormatParams]);

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

    onFormatClick(FormatKeys.Percentage, { digitsAmount: 1 } as NumberKeyData);
  }, [onFormatClick, selectedFormat]);

  const handleCommaSelect = useCallback(() => {
    const typedSelectedFormat = selectedFormatParams as
      | NumberKeyData
      | CurrencyKeyData
      | undefined;
    const newCommaValue = !isCommaSelected;

    if (
      ![FormatKeys.Number, FormatKeys.Currency, FormatKeys.Percentage].includes(
        selectedFormat
      ) ||
      !selectedFormatParams
    ) {
      onFormatClick(FormatKeys.Number, {
        digitsAmount: typedSelectedFormat?.digitsAmount ?? 1,
        thousandComma: newCommaValue,
      } as NumberKeyData);

      return;
    }

    onFormatClick(selectedFormat, {
      ...selectedFormatParams,
      thousandComma: newCommaValue,
    } as NumberKeyData);
  }, [isCommaSelected, onFormatClick, selectedFormat, selectedFormatParams]);

  const handleDecimalDigitsChange = useCallback(
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
          digitsAmount: 1,
        } as NumberKeyData);

        return;
      }
      const newDecimalAmount = Math.max(
        0,
        ((selectedFormatParams as NumberKeyData).digitsAmount ?? 1) + change
      );

      if (selectedFormat === FormatKeys.Number) {
        onFormatClick(FormatKeys.Number, {
          thousandComma: (selectedFormatParams as NumberKeyData).thousandComma,
          digitsAmount: newDecimalAmount,
        } as NumberKeyData);

        return;
      }
      if (selectedFormat === FormatKeys.Scientific) {
        onFormatClick(FormatKeys.Scientific, {
          digitsAmount: newDecimalAmount,
        } as NumberKeyData);

        return;
      }
      if (selectedFormat === FormatKeys.Currency) {
        onFormatClick(FormatKeys.Currency, {
          digitsAmount: newDecimalAmount,
          currencySymbol: (selectedFormatParams as CurrencyKeyData)
            .currencySymbol,
          thousandComma: (selectedFormatParams as CurrencyKeyData)
            .thousandComma,
        } as CurrencyKeyData);

        return;
      }
      if (selectedFormat === FormatKeys.Percentage) {
        onFormatClick(FormatKeys.Percentage, {
          digitsAmount: newDecimalAmount,
        } as NumberKeyData);

        return;
      }
    },
    [onFormatClick, selectedFormat, selectedFormatParams]
  );

  const handleTotalDigitsChange = useCallback(
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
          digitsAmount: -4,
        } as NumberKeyData);

        return;
      }
      const newTotalDigitsAmount = Math.min(
        -4,
        ((selectedFormatParams as NumberKeyData).digitsAmount ?? 0) + change
      );

      if (selectedFormat === FormatKeys.Number) {
        onFormatClick(FormatKeys.Number, {
          thousandComma: (selectedFormatParams as NumberKeyData).thousandComma,
          digitsAmount: newTotalDigitsAmount,
        } as NumberKeyData);

        return;
      }
      if (selectedFormat === FormatKeys.Scientific) {
        onFormatClick(FormatKeys.Scientific, {
          digitsAmount: newTotalDigitsAmount,
        } as NumberKeyData);

        return;
      }
      if (selectedFormat === FormatKeys.Currency) {
        onFormatClick(FormatKeys.Currency, {
          digitsAmount: newTotalDigitsAmount,
          currencySymbol: (selectedFormatParams as CurrencyKeyData)
            .currencySymbol,
          thousandComma: true,
        } as CurrencyKeyData);

        return;
      }
      if (selectedFormat === FormatKeys.Percentage) {
        onFormatClick(FormatKeys.Percentage, {
          digitsAmount: newTotalDigitsAmount,
        } as NumberKeyData);

        return;
      }
    },
    [onFormatClick, selectedFormat, selectedFormatParams]
  );

  const handleDigitsModeSelect = useCallback(
    (info: MenuInfo) => {
      const parsedKey = JSON.parse(info.key);
      const action: string = parsedKey.action;

      switch (action) {
        case DigitsModeKeys.DecimalDigits: {
          handleDecimalDigitsChange(0);
          break;
        }
        case DigitsModeKeys.TotalDigits: {
          handleTotalDigitsChange(0);
          break;
        }
        case DigitsModeKeys.CompactK: {
          const isCurrentFormatCompatible = [
            FormatKeys.Number,
            FormatKeys.Currency,
            FormatKeys.Percentage,
          ].includes(selectedFormat);

          onFormatClick(
            isCurrentFormatCompatible ? selectedFormat : FormatKeys.Number,
            {
              ...(isCurrentFormatCompatible ? selectedFormatParams : undefined),
              digitsAmount: undefined,
              compactFormat: 'K',
            } as NumberKeyData
          );
          break;
        }
        case DigitsModeKeys.CompactM: {
          const isCurrentFormatCompatible = [
            FormatKeys.Number,
            FormatKeys.Currency,
            FormatKeys.Percentage,
          ].includes(selectedFormat);

          onFormatClick(
            isCurrentFormatCompatible ? selectedFormat : FormatKeys.Number,
            {
              ...(isCurrentFormatCompatible ? selectedFormatParams : undefined),
              digitsAmount: undefined,
              compactFormat: 'M',
            } as NumberKeyData
          );
          break;
        }
        case DigitsModeKeys.CompactB: {
          const isCurrentFormatCompatible = [
            FormatKeys.Number,
            FormatKeys.Currency,
            FormatKeys.Percentage,
          ].includes(selectedFormat);

          onFormatClick(
            isCurrentFormatCompatible ? selectedFormat : FormatKeys.Number,
            {
              ...(isCurrentFormatCompatible ? selectedFormatParams : undefined),
              digitsAmount: undefined,
              compactFormat: 'B',
            } as NumberKeyData
          );
          break;
        }
        default:
          break;
      }
    },
    [
      handleDecimalDigitsChange,
      handleTotalDigitsChange,
      onFormatClick,
      selectedFormat,
      selectedFormatParams,
    ]
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
        case FormatKeys.Number: {
          setSelectedFormatParams({
            digitsAmount: typeof args[0] === 'number' ? args[0] : undefined,
            compactFormat: ['K', 'M', 'B'].includes(args[0])
              ? args[0]
              : undefined,
            thousandComma: !!args[1],
          });
          break;
        }
        case FormatKeys.Scientific:
          setSelectedFormatParams({
            digitsAmount: args[0],
          });
          break;
        case FormatKeys.Currency:
          setSelectedFormatParams({
            digitsAmount: typeof args[0] === 'number' ? args[0] : undefined,
            compactFormat: ['K', 'M', 'B'].includes(args[0])
              ? args[0]
              : undefined,
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
            digitsAmount: typeof args[0] === 'number' ? args[0] : undefined,
            compactFormat: ['K', 'M', 'B'].includes(args[0])
              ? args[0]
              : undefined,
            thousandComma: !!args[1],
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
      <div className="border-x border-stroke-tertiary w-28 md:w-36">
        <Tooltip
          className={classNames(isDisabled && 'cursor-not-allowed')}
          title={
            isDisabled
              ? 'Select table column cell to being able to set format'
              : 'Select format'
          }
          destroyOnHidden
        >
          <div className="h-7">
            <Dropdown
              autoAdjustOverflow={true}
              autoFocus={true}
              className={classNames(isDisabled && 'text-controls-text-disable')}
              destroyOnHidden={true}
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
          destroyOnHidden
        >
          <button
            className={classNames(
              'h-[18px] flex items-center enabled:hover:text-text-accent-primary disabled:text-controls-text-disable disabled:cursor-not-allowed',
              isPercentageSelected
                ? 'text-text-accent-primary'
                : 'text-text-secondary'
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
          destroyOnHidden
        >
          <button
            className={classNames(
              'h-[18px] flex items-center enabled:hover:text-text-accent-primary disabled:text-controls-text-disable disabled:cursor-not-allowed',
              isCommaSelected
                ? 'text-text-accent-primary'
                : 'text-text-secondary'
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

        <Dropdown
          className={classNames(
            'group flex items-center',
            isDisabled
              ? 'cursor-not-allowed text-controls-text-disable'
              : 'text-text-secondary hover:text-text-accent-primary'
          )}
          disabled={isDisabled}
          menu={{
            items: digitsModeItems,
            onClick: handleDigitsModeSelect,
          }}
          open={isDigitsModeMenuOpened}
          onOpenChange={setIsDigitsModeMenuOpened}
        >
          <Tooltip
            title={
              isDisabled
                ? 'Select table column cell to being able to set format'
                : undefined
            }
            destroyOnHidden
          >
            <Icon
              className={classNames('w-[18px]')}
              component={() =>
                isDecimalDigitsSelected ? (
                  <DecimalDigitsIcon />
                ) : isSignificantDigitsSelected ? (
                  <DigitsIcon />
                ) : isCompactDigitsSelected ? (
                  <KMBIcon />
                ) : (
                  <DecimalDigitsIcon />
                )
              }
            />
            <Icon
              className={classNames(
                'hidden md:inline-block w-[12px] transition-all',
                isDigitsModeMenuOpened && 'rotate-180'
              )}
              component={() => <ChevronDown />}
            />
          </Tooltip>
        </Dropdown>

        {!isSignificantDigitsSelected ? (
          <>
            <Tooltip
              title={
                isDisabled
                  ? 'Select table column cell to being able to set format'
                  : 'Reduce decimal amount'
              }
              destroyOnHidden
            >
              <button
                className="h-[18px] flex items-center text-text-secondary enabled:hover:text-text-accent-primary disabled:text-controls-text-disable disabled:cursor-not-allowed"
                disabled={isDisabled}
                onClick={() => handleDecimalDigitsChange(-1)}
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
              destroyOnHidden
            >
              <button
                className="h-[18px] flex items-center text-text-secondary enabled:hover:text-text-accent-primary disabled:text-controls-text-disable disabled:cursor-not-allowed"
                disabled={isDisabled}
                onClick={() => handleDecimalDigitsChange(1)}
              >
                <Icon
                  className="h-[18px] w-[18px] shrink-0"
                  component={() => <DecimalRightIcon />}
                ></Icon>
              </button>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip
              title={
                isDisabled
                  ? 'Select table column cell to being able to set format'
                  : 'Reduce significant digits amount'
              }
              destroyOnHidden
            >
              <button
                className="h-[18px] flex items-center text-text-secondary enabled:hover:text-text-accent-primary disabled:text-controls-text-disable disabled:cursor-not-allowed"
                disabled={isDisabled}
                onClick={() => handleTotalDigitsChange(1)}
              >
                <Icon
                  className="h-[18px] w-[18px] shrink-0"
                  component={() => <DigitsLeftIcon />}
                ></Icon>
              </button>
            </Tooltip>
            <Tooltip
              title={
                isDisabled
                  ? 'Select table column cell to being able to set format'
                  : 'Increase significant digits amount'
              }
              destroyOnHidden
            >
              <button
                className="h-[18px] flex items-center text-text-secondary enabled:hover:text-text-accent-primary disabled:text-controls-text-disable disabled:cursor-not-allowed"
                disabled={isDisabled}
                onClick={() => handleTotalDigitsChange(-1)}
              >
                <Icon
                  className="h-[18px] w-[18px] shrink-0"
                  component={() => <DigitsRightIcon />}
                ></Icon>
              </button>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
};
