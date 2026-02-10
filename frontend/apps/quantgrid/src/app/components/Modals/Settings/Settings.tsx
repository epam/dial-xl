import { Button } from 'antd';
import classNames from 'classnames';
import {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import Select, { SingleValue } from 'react-select';

import {
  filesEndpointType,
  primaryButtonClasses,
  secondaryButtonClasses,
  SelectClasses,
} from '@frontend/common';
import { AppTheme } from '@frontend/common';
import { DefaultOptionType } from '@rc-component/select/lib/Select';

import { ApiContext, DashboardContext } from '../../../context';
import { useApiRequests } from '../../../hooks';
import { useUserSettingsStore } from '../../../store';
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

const showHideOptions = [
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
  const serverLogoSrc = useUserSettingsStore((s) => s.data.logoSrc);
  const theme = useUserSettingsStore((s) => s.data.appTheme);
  const showHiddenFiles = useUserSettingsStore((s) => s.data.showHiddenFiles);
  const setSetting = useUserSettingsStore((s) => s.patch);
  const showGridLines = useUserSettingsStore((s) => s.data.showGridLines);
  const { userBucket } = useContext(ApiContext);
  const { refetchData } = useContext(DashboardContext);
  const { downloadUserBucket, uploadUserBucket } = useApiRequests();

  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);
  const [logoBucket, setLogoBucket] = useState<string | undefined>(undefined);
  const [logoPath, setLogoPath] = useState<string | undefined>(undefined);
  const [logoName, setLogoName] = useState<string | undefined>(undefined);

  const [selectedTheme, setSelectedTheme] = useState<
    SingleValue<DefaultOptionType>
  >(themeOptions[0]);
  const [selectedShowHiddenFiles, setSelectedShowHiddenFiles] = useState<
    SingleValue<DefaultOptionType>
  >(showHideOptions[0]);
  const [selectedShowGridLines, setSelectedShowGridLines] = useState<
    SingleValue<DefaultOptionType>
  >(showHideOptions[1]);

  const onChangeTheme = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      setSelectedTheme(option);
      setSetting({ appTheme: option?.value as AppTheme });
    },
    [setSetting],
  );

  const onChangeHiddenFiles = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      setSelectedShowHiddenFiles(option);
      setSetting({ showHiddenFiles: option?.value === 'true' });
    },
    [setSetting],
  );

  const onChangeShowGridLines = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      setSelectedShowGridLines(option);
      setSetting({ showGridLines: option?.value === 'true' });
    },
    [setSetting],
  );

  const handleUpdateInputFile = useCallback(
    (
      bucket: string | undefined,
      path: string | null | undefined,
      name: string | undefined,
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

      setSetting({ logoSrc: fileSrc });
    },
    [setSetting],
  );

  const handleUploadFiles = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const res = await uploadUserBucket({ file });
      if (!res) return;

      refetchData?.();
    },
    [refetchData, uploadUserBucket],
  );

  useEffect(() => {
    if (!theme) return;

    const findTheme = themeOptions.find((t) => t.value === theme);

    setSelectedTheme(findTheme ? findTheme : themeOptions[0]);
  }, [theme]);

  useEffect(() => {
    if (showHiddenFiles === undefined) return;

    const findOption = showHideOptions.find(
      (t) => t.value === showHiddenFiles.toString(),
    );

    setSelectedShowHiddenFiles(findOption ? findOption : showHideOptions[0]);
  }, [showHiddenFiles]);

  useEffect(() => {
    if (showGridLines === undefined) return;

    const findOption = showHideOptions.find(
      (t) => t.value === showGridLines.toString(),
    );

    setSelectedShowGridLines(findOption ? findOption : showHideOptions[1]);
  }, [showGridLines]);

  useEffect(() => {
    if (!serverLogoSrc) return;

    const [_prefix, rest] = serverLogoSrc.split('api/' + filesEndpointType);
    const [_, bucket, ...pathWithName] = rest.split('/');
    const name = pathWithName[pathWithName.length - 1];
    const path = pathWithName.slice(0, -1);

    setLogoBucket(bucket);
    setLogoPath(constructPath(path));
    setLogoName(name);
  }, [serverLogoSrc]);

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
            options={showHideOptions}
            value={selectedShowHiddenFiles}
            onChange={onChangeHiddenFiles}
          />
        </div>
      </div>

      <div className="flex items-center my-3">
        <span className="text-text-primary text-[13px] w-[80px]">
          Grid lines:
        </span>
        <div className="w-[300px] ml-5">
          <Select
            classNames={SelectClasses}
            components={{
              IndicatorSeparator: null,
            }}
            isSearchable={false}
            name="hideGridLinesSelect"
            options={showHideOptions}
            value={selectedShowGridLines}
            onChange={onChangeShowGridLines}
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

      {userBucket && (
        <div className="flex items-center my-3">
          <span className="text-text-primary text-[13px] w-[100px]">
            User files:
          </span>

          <Button
            className={classNames(primaryButtonClasses, 'h-7 w-[150px] mr-4')}
            onClick={downloadUserBucket}
          >
            Download all files
          </Button>

          <Button
            className={classNames(secondaryButtonClasses, 'h-7 w-[120px]')}
            onClick={() => uploadFileInputRef.current?.click()}
          >
            Upload files
          </Button>

          <input
            accept=".zip,application/zip"
            className="hidden"
            ref={uploadFileInputRef}
            type="file"
            onChange={handleUploadFiles}
          />
        </div>
      )}
    </div>
  );
}
