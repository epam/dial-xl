import { DefaultOptionType } from 'rc-select/lib/Select';
import { useCallback, useContext, useEffect, useState } from 'react';
import Select, { SingleValue } from 'react-select';

import { filesEndpointType, SelectClasses } from '@frontend/common';
import { AppTheme } from '@frontend/common';

import { logoSrcStorageKey } from '../../../common';
import { ApiContext, AppContext } from '../../../context';
import { constructPath } from '../../../utils';
import { SelectResourceInput } from '../../SelectResourceInput';

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
  const { userBucket } = useContext(ApiContext);

  const [logoBucket, setLogoBucket] = useState<string | undefined>(undefined);
  const [logoPath, setLogoPath] = useState<string | undefined>(undefined);
  const [logoName, setLogoName] = useState<string | undefined>(undefined);

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

  const handleUpdateInputFile = useCallback(
    (
      bucket: string | undefined,
      path: string | null | undefined,
      name: string | undefined
    ) => {
      setLogoBucket(bucket);
      setLogoPath(constructPath([path]));
      setLogoName(name);

      const fileSrc = bucket
        ? constructPath([
            window.externalEnv.dialOverlayUrl,
            'api',
            filesEndpointType,
            bucket,
            path,
            name,
          ])
        : '';

      localStorage.setItem(logoSrcStorageKey, fileSrc);
    },
    []
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

  useEffect(() => {
    const logoSrc = localStorage.getItem(logoSrcStorageKey);
    if (logoSrc) {
      const [_prefix, rest] = logoSrc.split('api/' + filesEndpointType);
      const [_, bucket, ...pathWithName] = rest.split('/');
      const name = pathWithName[pathWithName.length - 1];
      const path = pathWithName.slice(0, -1);

      setLogoBucket(bucket);
      setLogoPath(constructPath(path));
      setLogoName(name);
    }
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex items-center my-3">
        <span className="text-text-primary text-[13px] w-[80px]">Theme:</span>
        <div className="w-[300px] ml-5">
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
        <span className="text-text-primary text-[13px] w-[80px]">
          Hidden files:
        </span>
        <div className="w-[300px] ml-5">
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
      {userBucket && (
        <div className="flex items-center my-3">
          <span className="text-text-primary text-[13px] w-[80px]">Logo:</span>
          <div className="w-[300px] ml-5">
            <SelectResourceInput
              bucket={logoBucket}
              changeLabel={logoBucket ? 'Change' : 'Add'}
              fileExtensions={['.png', '.jpg', '.jpeg', '.svg']}
              inputLabel=""
              isSelectFolder={false}
              name={logoName}
              path={logoPath}
              onReset={
                logoBucket
                  ? () => handleUpdateInputFile(undefined, undefined, undefined)
                  : undefined
              }
              onSelect={handleUpdateInputFile}
            />
          </div>
        </div>
      )}
    </div>
  );
}
