import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DimensionalSchemaResponse,
  InputFile,
  InputList,
} from '@frontend/common';

import { useApi } from '../hooks';
import useEventBus from '../hooks/useEventBus';
import { ProjectContext } from './ProjectContext';

type Inputs = {
  [fileName: string]: { fields: string[] };
};

type InputsContextActions = {
  inputList: InputFile[] | null;

  inputs: Inputs;

  onInputListResponse: (inputList: InputList) => void;
};

export const InputsContext = createContext<InputsContextActions>(
  {} as InputsContextActions
);

export function InputsContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { getInputs, getDimensionalSchema } = useApi();
  const { projectName } = useContext(ProjectContext);
  const eventBus = useEventBus();

  const [inputList, setInputList] = useState<InputFile[] | null>(null);

  const [inputs, setInputs] = useState<Inputs>({});

  const onInputListResponse = useCallback((inputList: InputList) => {
    setInputList(inputList.inputs);
  }, []);

  const onDimensionalSchemaResponse = useCallback(
    (response: DimensionalSchemaResponse) => {
      const { schema, formula } = response;
      if (!formula.startsWith('INPUT')) return;

      const fileName = formula.slice(
        formula.indexOf('"') + 1,
        formula.lastIndexOf('"')
      );

      setInputs((prevInputs) => {
        return { ...prevInputs, [fileName]: { fields: schema } };
      });
    },
    []
  );

  useEffect(() => {
    getInputs();
    // below triggers, not dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!inputList || !projectName) return;

    for (const inputFile of inputList) {
      let path = inputFile.inputName;

      if (inputFile.paths?.length) {
        path = inputFile.paths.join('/') + '/' + path;
      }

      getDimensionalSchema(projectName, `INPUT("${path}")`, true);
    }
  }, [getDimensionalSchema, inputList, projectName]);

  useEffect(() => {
    const apiResponseListener = eventBus.subscribe(
      'DimensionalSchemaResponse',
      onDimensionalSchemaResponse
    );

    return () => {
      apiResponseListener.unsubscribe();
    };
  }, [eventBus, onDimensionalSchemaResponse]);

  const value = useMemo(
    () => ({
      inputList,
      onInputListResponse,
      inputs,
    }),
    [inputList, inputs, onInputListResponse]
  );

  return (
    <InputsContext.Provider value={value}>{children}</InputsContext.Provider>
  );
}
