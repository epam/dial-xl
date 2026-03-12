import { Tooltip } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useMemo } from 'react';
import { GroupBase, SingleValue } from 'react-select';
import Select from 'react-select';

import Icon from '@ant-design/icons';
import {
  CompilationError,
  CompileErrorIcon,
  EvaluationError,
  IndexError,
  KeyIcon,
  ParsingError,
  ParsingErrorIcon,
  RuntimeError,
  RuntimeErrorIcon,
  SelectCompactClasses,
  SelectOption,
  selectStyles,
} from '@frontend/common';

import { ProjectContext } from '../../../context';
import { getErrorLocationInfo } from '../../../utils';

type ErrorType = 'compile' | 'runtime' | 'index' | 'parsing';

interface ErrorPanelTopBarProps {
  parsingErrors: ParsingError[] | null;
  selectedSheet: string | null;
  onSheetChange: (sheet: string | null) => void;
  filteredErrorTypes: Set<ErrorType>;
  onToggleErrorType: (errorType: ErrorType) => void;
  compilationErrors: CompilationError[] | null;
  runtimeErrors: RuntimeError[] | null;
  indexErrors: IndexError[] | null;
}

export function ErrorPanelTopBar({
  selectedSheet,
  onSheetChange,
  filteredErrorTypes,
  onToggleErrorType,
  parsingErrors,
  compilationErrors,
  runtimeErrors,
  indexErrors,
}: ErrorPanelTopBarProps) {
  const { projectSheets, parsedSheets } = useContext(ProjectContext);

  const sheetOptions = useMemo<SelectOption[]>(() => {
    const options: SelectOption[] = [{ value: null, label: 'All sheets' }];

    if (projectSheets) {
      projectSheets.forEach((sheet) => {
        options.push({
          value: sheet.sheetName,
          label: sheet.sheetName,
        });
      });
    }

    return options;
  }, [projectSheets]);

  const getErrorCount = useCallback(
    (errorType: ErrorType): number => {
      let errors: EvaluationError[] | null = null;

      switch (errorType) {
        case 'compile':
          errors = compilationErrors;
          break;
        case 'runtime':
          errors = runtimeErrors;
          break;
        case 'index':
          errors = indexErrors;
          break;
        case 'parsing':
          errors = parsingErrors;
          break;
      }

      if (!errors || errors.length === 0) return 0;

      if (!selectedSheet || selectedSheet === 'all') {
        return errors.length;
      }

      return errors.filter((error) => {
        const locationInfo = getErrorLocationInfo(error, parsedSheets);

        return locationInfo?.sheetName === selectedSheet;
      }).length;
    },
    [
      selectedSheet,
      compilationErrors,
      runtimeErrors,
      indexErrors,
      parsingErrors,
      parsedSheets,
    ],
  );

  const compileCount = getErrorCount('compile');
  const runtimeCount = getErrorCount('runtime');
  const indexCount = getErrorCount('index');
  const parsingCount = getErrorCount('parsing');

  const handleSheetChange = useCallback(
    (option: SingleValue<SelectOption>) => {
      const value = option?.value as string;
      onSheetChange(value);
    },
    [onSheetChange],
  );

  const selectedOption = useMemo(() => {
    if (!selectedSheet) {
      return sheetOptions[0]; // "All sheets"
    }

    return (
      sheetOptions.find((opt) => opt.value === selectedSheet) || sheetOptions[0]
    );
  }, [selectedSheet, sheetOptions]);

  const getIconComponent = useCallback((errorType: ErrorType) => {
    switch (errorType) {
      case 'compile':
        return CompileErrorIcon;
      case 'runtime':
        return RuntimeErrorIcon;
      case 'index':
        return KeyIcon;
      case 'parsing':
        return ParsingErrorIcon;
    }
  }, []);

  const getIconTitle = useCallback((errorType: ErrorType) => {
    switch (errorType) {
      case 'compile':
        return 'compile errors';
      case 'runtime':
        return 'runtime errors';
      case 'index':
        return 'index errors';
      case 'parsing':
        return 'parsing errors';
    }
  }, []);

  const errorTypeConfigs: Array<{ type: ErrorType; count: number }> = useMemo(
    () => [
      { type: 'parsing', count: parsingCount },
      { type: 'compile', count: compileCount },
      { type: 'runtime', count: runtimeCount },
      { type: 'index', count: indexCount },
    ],
    [parsingCount, compileCount, runtimeCount, indexCount],
  );

  return (
    <div className="flex flex-col gap-2 p-2 border-b border-stroke-tertiary bg-bg-layer-2 @xs:flex-row @xs:items-center">
      <div className="min-w-0 w-full @xs:w-auto grow">
        <Select<SelectOption, false, GroupBase<SelectOption>>
          classNames={SelectCompactClasses}
          components={{
            IndicatorSeparator: null,
          }}
          isSearchable={false}
          menuPosition="fixed"
          options={sheetOptions}
          styles={selectStyles}
          value={selectedOption}
          onChange={handleSheetChange}
        />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {errorTypeConfigs.map(({ type, count }) => {
          const isFiltered = filteredErrorTypes.has(type);
          const IconComponent = getIconComponent(type);

          return (
            <Tooltip
              key={type}
              title={`${isFiltered ? 'Show' : 'Hide'} ${count} ${getIconTitle(
                type,
              )}`}
              destroyOnHidden
            >
              <button
                className={classNames(
                  'flex items-center gap-1 px-2 py-1 rounded-[3px] transition-colors bg-bg-accent-primary-alpha cursor-pointer',
                  isFiltered
                    ? 'text-text-secondary opacity-50 hover:bg-bg-accent-primary-alpha-2'
                    : 'text-text-primary hover:bg-bg-layer-4',
                )}
                key={type}
                type="button"
                onClick={() => onToggleErrorType(type)}
              >
                <Icon
                  className="size-[16px] shrink-0"
                  component={() => <IconComponent />}
                />
                <span className="text-[13px] font-medium">{count}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
