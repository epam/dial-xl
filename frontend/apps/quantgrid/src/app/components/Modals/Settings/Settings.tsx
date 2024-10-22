import { DefaultOptionType } from 'rc-select/lib/Select';
import { useCallback, useContext, useEffect, useState } from 'react';
import Select, { SingleValue } from 'react-select';

import { SelectClasses } from '@frontend/common';
import { AppTheme } from '@frontend/common';

import { AppContext } from '../../../context';

const themeOptions = [
  {
    value: AppTheme.ThemeLight,
    label: 'Light',
  },
  {
    value: AppTheme.ThemeDark,
    label: 'Dark',
  },
  {
    value: AppTheme.ThemeDarkMixed,
    label: 'Dark (light spreadsheet)',
  },
];

const hiddenFilesOptions = [
  {
    value: 'false',
    label: 'Hide',
  },
  {
    value: 'true',
    label: 'Show',
  },
];

export function Settings() {
  const { updateTheme, switchShowHiddenFiles } = useContext(AppContext);

  const [selectedTheme, setSelectedTheme] = useState<
    SingleValue<DefaultOptionType>
  >(themeOptions[0]);
  const [selectedShowHiddenFiles, setSelectedShowHiddenFiles] = useState<
    SingleValue<DefaultOptionType>
  >(hiddenFilesOptions[0]);

  const onChangeTheme = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      setSelectedTheme(option);
      updateTheme(option?.value as string);
    },
    [updateTheme]
  );

  const onChangeHiddenFiles = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      setSelectedShowHiddenFiles(option);
      switchShowHiddenFiles(option?.value === 'true');
    },
    [switchShowHiddenFiles]
  );

  useEffect(() => {
    const theme = localStorage.getItem('app-theme');

    if (!theme) return;

    const findTheme = themeOptions.find((t) => t.value === theme);

    setSelectedTheme(findTheme ? findTheme : themeOptions[0]);
  }, []);

  useEffect(() => {
    const savedOption = localStorage.getItem('show-hidden-files');

    if (!savedOption) return;

    const findOption = hiddenFilesOptions.find((t) => t.value === savedOption);

    setSelectedShowHiddenFiles(findOption ? findOption : hiddenFilesOptions[0]);
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex items-center my-3">
        <span className="text-textPrimary text-[13px] w-[80px]">Theme:</span>
        <div className="w-[200px] ml-5">
          <Select
            classNames={SelectClasses}
            components={{
              IndicatorSeparator: null,
            }}
            isSearchable={false}
            name="themeSelect"
            options={themeOptions}
            value={selectedTheme}
            onChange={onChangeTheme}
          />
        </div>
      </div>
      <div className="flex items-center my-3">
        <span className="text-textPrimary text-[13px] w-[80px]">
          Hidden files:
        </span>
        <div className="w-[200px] ml-5">
          <Select
            classNames={SelectClasses}
            components={{
              IndicatorSeparator: null,
            }}
            isSearchable={false}
            name="showHiddenFilesSelect"
            options={hiddenFilesOptions}
            value={selectedShowHiddenFiles}
            onChange={onChangeHiddenFiles}
          />
        </div>
      </div>
    </div>
  );
}
