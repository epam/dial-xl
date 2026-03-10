import { Steps } from 'antd';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import isEqual from 'react-fast-compare';

import {
  filesEndpointType,
  ImportConnectionResult,
  ImportDefinition,
  ImportSource,
  ProtoStruct,
} from '@frontend/common';

import { InputsContext, ProjectContext } from '../../../context';
import { useApiRequests, useUnsavedChanges } from '../../../hooks';
import { createUniqueName } from '../../../services';
import { constructPath, encodeApiUrl } from '../../../utils';
import { ImportStep1 } from './ImportStep1';
import { ImportStep2 } from './ImportStep2';
import { ImportStep3 } from './ImportStep3';

interface Props {
  sourceData: ImportSource | null;
  onDataChanged: (isDataDifferent: boolean) => void;
  onSuccess: () => void;
}

export const ImportSteps = ({
  sourceData,
  onDataChanged,
  onSuccess,
}: Props) => {
  const { projectName, projectBucket, projectPath } =
    useContext(ProjectContext);
  const { onRenameImportSource, importSources } = useContext(InputsContext);
  const { createImportSource, updateImportSource, listImportDefinitions } =
    useApiRequests();
  const [selectedDefinition, setSelectedDefinition] = useState<string | null>(
    null,
  );

  const [sourceName, setSourceName] = useState(sourceData?.name);
  const [availableSourceName, setAvailableSourceName] = useState('');
  const [configuration, setConfiguration] = useState<ProtoStruct | null>(
    sourceData?.configuration ?? {},
  );
  const [currentStep, setCurrentStep] = useState<number>(sourceData ? 1 : 0);
  const [connectionResult, setConnectionResult] = useState<
    ImportConnectionResult | 'IN_PROGRESS' | 'EMPTY'
  >('EMPTY');
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const [isStepChanged, setIsStepChanged] = useState(false);

  const isChanged = useMemo(
    () =>
      isStepChanged ||
      (!sourceData
        ? !!(
            (configuration && Object.keys(configuration).length !== 0) ||
            (!!sourceName && sourceName !== availableSourceName)
          )
        : !isEqual(sourceData.configuration, configuration) ||
          sourceData.name !== sourceName),
    [configuration, availableSourceName, isStepChanged, sourceData, sourceName],
  );

  useUnsavedChanges(isChanged);

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

  const [importDefinitions, setImportDefinitions] = useState<
    ImportDefinition[]
  >([]);
  const fullSelectedDefinition: ImportDefinition | null = useMemo(
    () =>
      importDefinitions.find(
        (item) => item.definition === selectedDefinition,
      ) ??
      (selectedDefinition
        ? { definition: selectedDefinition, name: selectedDefinition }
        : null),
    [importDefinitions, selectedDefinition],
  );

  const handleCreateSource = useCallback(async () => {
    if (!configuration || !selectedDefinition || !sourceName) return;

    setIsSaveInProgress(true);

    const result = await createImportSource({
      project: projectPathApi,
      sourceName,
      definition: selectedDefinition as string,
      configuration: configuration,
    });

    setIsSaveInProgress(false);

    if (!result) return;

    onSuccess();
  }, [
    configuration,
    createImportSource,
    onSuccess,
    projectPathApi,
    selectedDefinition,
    sourceName,
  ]);

  const handleUpdateSource = useCallback(async () => {
    if (!configuration || !selectedDefinition || !sourceData || !sourceName)
      return;

    setIsSaveInProgress(true);

    const result = await updateImportSource({
      project: projectPathApi,
      sourceName,
      source: sourceData.source,
      configuration: configuration,
    });

    setIsSaveInProgress(false);

    if (!result) return;

    if (sourceData.name !== sourceName) {
      onRenameImportSource(sourceData.name, sourceName);
    }

    onSuccess();
  }, [
    configuration,
    onSuccess,
    projectPathApi,
    selectedDefinition,
    sourceData,
    sourceName,
    updateImportSource,
    onRenameImportSource,
  ]);

  const handleSelectDefinition = useCallback((definition: string) => {
    setSelectedDefinition(definition);

    setConfiguration(null);
    setConnectionResult('EMPTY');
  }, []);

  const handleSaveConfiguration = useCallback((configuration: ProtoStruct) => {
    setConfiguration(configuration);

    setConnectionResult('EMPTY');
  }, []);

  useEffect(() => {
    if (!sourceData) return;

    setSelectedDefinition(sourceData.definition);
    setSourceName(sourceData.name);

    if (!sourceData.configuration) return;

    setConfiguration(sourceData.configuration);
  }, [sourceData]);

  useEffect(() => {
    if (!projectBucket || !projectName) return;

    const handle = async () => {
      const importDefinitions = await listImportDefinitions({
        project: projectPathApi,
      });
      if (!importDefinitions) {
        setImportDefinitions([]);

        return;
      }

      const mappedDefinitions = Object.values(importDefinitions?.definitions);
      setImportDefinitions(mappedDefinitions);
      setAvailableSourceName(
        createUniqueName(
          'Source1',
          Object.values(importSources).map((item) => item.name),
        ),
      );
    };

    handle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectBucket, projectPath, projectName]);

  useEffect(() => {
    onDataChanged(isChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChanged]);

  return (
    <div className="flex flex-col gap-7 pt-5">
      <div className="w-[500px]">
        <Steps
          current={currentStep}
          items={[
            {
              title: 'Source',
              disabled: !!sourceData,
            },
            {
              title: 'Configuration',
            },
            {
              title: 'Test connection',
            },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        {currentStep === 0 && (
          <ImportStep1
            importDefinitions={importDefinitions}
            selectedDefinition={selectedDefinition}
            onNextStep={() => setCurrentStep((step) => step + 1)}
            onSelectDefinition={handleSelectDefinition}
          />
        )}

        {currentStep === 1 && fullSelectedDefinition && (
          <ImportStep2
            formData={configuration ?? {}}
            importSources={importSources}
            isUpdate={!!sourceData}
            selectedDefinition={fullSelectedDefinition}
            sourceName={sourceName ?? availableSourceName}
            onDataChanged={setIsStepChanged}
            onNextStep={() => {
              setIsStepChanged(false);
              setCurrentStep((step) => step + 1);
            }}
            onPreviousStep={() => {
              setIsStepChanged(false);
              setCurrentStep((step) => step - 1);
            }}
            onSaveConfiguration={(formData, sourceName) => {
              handleSaveConfiguration(formData);
              setSourceName(sourceName);
            }}
          />
        )}

        {currentStep === 2 &&
          configuration &&
          fullSelectedDefinition &&
          sourceName && (
            <ImportStep3
              configuration={configuration}
              connectionResult={connectionResult}
              isSaveInProgress={isSaveInProgress}
              saveButtonLabel={sourceData ? 'Update source' : 'Create source'}
              selectedDefinition={fullSelectedDefinition}
              onConnectionResult={setConnectionResult}
              onPreviousStep={() => setCurrentStep((step) => step - 1)}
              onSaveSource={
                sourceData ? handleUpdateSource : handleCreateSource
              }
            />
          )}
      </div>
    </div>
  );
};
