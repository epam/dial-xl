import { Input } from 'antd';
import cx from 'classnames';
import { format, getTime } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import { UTCDateMini } from '@date-fns/utc';
import {
  CalendarIcon,
  ClearIcon,
  DatePicker,
  excelDateToJsMilliseconds,
  inputClasses,
  jsMillisecondsToExcelDate,
} from '@frontend/common';

const iconClass = 'text-text-secondary w-4 h-4';

type Props = {
  expressionValue: string;
  formatPattern: string;
  onChange: (expressionValue: string) => void;
  showTime?: boolean;
  placeholder?: string;
  className?: string;
  onInputClick?: (e: React.MouseEvent) => void;
  onInputKeyDown?: (e: React.KeyboardEvent) => void;
};

export function DateInput({
  expressionValue,
  formatPattern,
  onChange,
  showTime = false,
  placeholder = 'Select date',
  className,
  onInputClick,
  onInputKeyDown,
}: Props) {
  const [open, setOpen] = useState(false);

  const valueDate = useMemo(() => {
    if (!expressionValue?.trim()) {
      return undefined;
    }

    const parsedFloatValue = parseFloat(expressionValue);
    if (isNaN(parsedFloatValue)) {
      return undefined;
    }

    const milis = excelDateToJsMilliseconds(parsedFloatValue);

    return new UTCDateMini(milis);
  }, [expressionValue]);

  const displayValue = useMemo(() => {
    if (valueDate && formatPattern) {
      return format(valueDate, formatPattern);
    }

    return expressionValue;
  }, [valueDate, formatPattern, expressionValue]);

  const handleInputClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen(true);
      onInputClick?.(e);
    },
    [onInputClick],
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onChange('');
      setOpen(false);
    },
    [onChange],
  );

  const handleChange = useCallback(
    (date: Date | null) => {
      if (!date) {
        onChange('');

        return;
      }
      const unixTime = getTime(date);
      const excelDate = jsMillisecondsToExcelDate(unixTime);

      onChange(excelDate.toString());

      if (!showTime) {
        setOpen(false);
      }
    },
    [onChange, showTime],
  );

  const suffix = displayValue ? (
    <button
      aria-label="Clear date"
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-text-secondary hover:bg-bg-layer-4 hover:text-text-primary"
      tabIndex={0}
      type="button"
      onClick={handleClear}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange('');
          setOpen(false);
        }
      }}
    >
      <Icon className={iconClass} component={() => <ClearIcon />} />
    </button>
  ) : (
    <span
      aria-label="Open calendar"
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-text-secondary hover:bg-bg-layer-4 hover:text-text-primary"
      role="button"
      tabIndex={0}
      onClick={handleInputClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(true);
        }
      }}
    >
      <Icon className={iconClass} component={() => <CalendarIcon />} />
    </span>
  );

  return (
    <div className={cx('relative w-full', className)}>
      <Input
        className={cx('ant-input-md', inputClasses)}
        placeholder={placeholder}
        suffix={suffix}
        value={displayValue}
        readOnly
        onClick={handleInputClick}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') {
            e.stopPropagation();
          }
          onInputKeyDown?.(e);
        }}
      />
      <div
        className="absolute left-0 top-0 h-full w-full opacity-0"
        style={{ pointerEvents: 'none' }}
        aria-hidden
      >
        <DatePicker
          format={(val) => format(val, formatPattern)}
          open={open}
          panelRender={(panel) => (
            <div className="z-50 bg-bg-layer-1" data-stop-propagation="true">
              {panel}
            </div>
          )}
          showTime={showTime}
          style={{ width: '100%', height: '100%' }}
          value={valueDate}
          onChange={handleChange}
          onOpenChange={handleOpenChange}
        />
      </div>
    </div>
  );
}
