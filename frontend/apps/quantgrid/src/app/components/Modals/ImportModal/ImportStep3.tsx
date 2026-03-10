import { Button, Spin } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  CheckIcon,
  filesEndpointType,
  ImportConnectionResult,
  ImportDefinition,
  NetworkIcon,
  NetworkOffIcon,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  ProtoStruct,
  secondaryButtonClasses,
} from '@frontend/common';

import { ProjectContext } from '../../../context';
import { useApiRequests } from '../../../hooks';
import { constructPath, encodeApiUrl } from '../../../utils';

const states = {
  EMPTY: {
    icon: (
      <Icon
        className="w-5 text-text-secondary"
        component={() => <NetworkIcon />}
      />
    ),
    title: 'No information about connection',
    subtitle: 'Test your connection before creating source',
    button: 'Test connection',
    buttonDisabled: false,
    buttonClasses: classNames(primaryButtonClasses),
  },
  IN_PROGRESS: {
    icon: <Spin className="size-5" />,
    title: 'Trying to connect to the source',
    subtitle: 'This may take some time',
    button: 'Test connection',
    buttonDisabled: true,
    buttonClasses: classNames(
      primaryButtonClasses,
      primaryDisabledButtonClasses,
    ),
  },
  SUCCESS: {
    icon: (
      <Icon
        className="w-5 text-text-accent-secondary"
        component={() => <CheckIcon />}
      />
    ),
    title: 'Connection successful',
    subtitle: 'You can now create your source',
    button: 'Test connection',
    buttonDisabled: false,
    buttonClasses: classNames(secondaryButtonClasses),
  },
  FAILURE: {
    icon: (
      <Icon
        className="w-5 text-text-error"
        component={() => <NetworkOffIcon />}
      />
    ),
    title: 'Connection failed',
    subtitle: 'Please, review your configuration',
    button: 'Test connection',
    buttonDisabled: false,
    buttonClasses: classNames(secondaryButtonClasses),
  },
};

interface Props {
  selectedDefinition: ImportDefinition;
  configuration: ProtoStruct;
  connectionResult: ImportConnectionResult | 'IN_PROGRESS' | 'EMPTY';
  isSaveInProgress: boolean;
  saveButtonLabel: string;
  onConnectionResult: (
    result: ImportConnectionResult | 'IN_PROGRESS' | 'EMPTY',
  ) => void;
  onSaveSource: () => void;
  onPreviousStep: () => void;
}

export const ImportStep3 = ({
  selectedDefinition,
  configuration,
  connectionResult,
  saveButtonLabel,
  isSaveInProgress,
  onConnectionResult,
  onSaveSource,
  onPreviousStep,
}: Props) => {
  const { projectName, projectBucket, projectPath } =
    useContext(ProjectContext);
  const { testImportConnection } = useApiRequests();

  const projectPathApi = useMemo(
    () =>
      encodeApiUrl(
        constructPath([
          filesEndpointType,
          projectBucket,
          projectPath,
          projectName,
        ]),
      ),
    [projectBucket, projectName, projectPath],
  );

  const handleTestConnection = useCallback(async () => {
    if (!configuration || !selectedDefinition) return;

    try {
      onConnectionResult('IN_PROGRESS');

      const connectionResult = await testImportConnection({
        project: projectPathApi,
        configuration,
        definition: selectedDefinition.definition,
      });

      onConnectionResult(connectionResult?.result ?? 'FAILURE');
    } catch {
      onConnectionResult('FAILURE');
    }
  }, [
    configuration,
    onConnectionResult,
    projectPathApi,
    selectedDefinition,
    testImportConnection,
  ]);

  return (
    <>
      <div className="flex justify-center h-[200px]">
        <div
          className={classNames(
            'flex justify-center p-3 flex-col items-center w-full gap-4 rounded-md bg-bg-layer-2 border',
            connectionResult === 'SUCCESS'
              ? 'border-stroke-accent-secondary'
              : connectionResult === 'FAILURE'
                ? 'border-stroke-error'
                : 'border-transparent',
          )}
        >
          <div className="flex flex-col gap-2 text-[13px] items-center">
            <span>{states[connectionResult].icon}</span>

            <span className="text-center text-text-primary font-semibold">
              {states[connectionResult].title}
            </span>
            <span className="text-center text-text-primary">
              {states[connectionResult].subtitle}
            </span>
          </div>

          <Button
            className={states[connectionResult].buttonClasses}
            disabled={states[connectionResult].buttonDisabled}
            onClick={handleTestConnection}
          >
            {states[connectionResult].button}
          </Button>
        </div>
      </div>

      <div className="flex w-full flex-col gap-4">
        <hr className="border-stroke-tertiary w-[calc(100%+48px)] -ml-6" />
        <div className="flex justify-end gap-3">
          <Button
            className={classNames(secondaryButtonClasses)}
            onClick={onPreviousStep}
          >
            Previous
          </Button>
          <Button
            className={classNames(
              primaryButtonClasses,
              primaryDisabledButtonClasses,
            )}
            disabled={connectionResult !== 'SUCCESS'}
            loading={isSaveInProgress}
            onClick={onSaveSource}
          >
            {saveButtonLabel}
          </Button>
        </div>
      </div>
    </>
  );
};
