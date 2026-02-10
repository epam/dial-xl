import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ApiError, FunctionInfo, WorksheetState } from '@frontend/common';

import { useApiRequests } from '../useApiRequests';

type Props = {
  currentSheetContent: string | null;
  sheets?: WorksheetState[];
  onSetProjectDataLoadingError: Dispatch<SetStateAction<ApiError | null>>;
};

export function useGetFunctions({
  currentSheetContent,
  sheets,
  onSetProjectDataLoadingError,
}: Props) {
  const { getFunctions: apiGetFunctions } = useApiRequests();

  const [data, setData] = useState<FunctionInfo[]>([]);

  const reqIdRef = useRef(0);

  const fetchFunctions = useCallback(async () => {
    if (!sheets) {
      setData([]);

      return;
    }

    ++reqIdRef.current;
    const id = reqIdRef.current;

    const worksheets = sheets.reduce(
      (acc, curr) => {
        acc[curr.sheetName] = curr.content;

        return acc;
      },
      {} as Record<string, string>,
    );

    const resp = await apiGetFunctions({ worksheets, suppressErrors: true });

    if (id !== reqIdRef.current) return;

    if (!resp.success) {
      onSetProjectDataLoadingError(resp.error);
      setData([]);

      return;
    }

    setData(resp.data);
  }, [apiGetFunctions, onSetProjectDataLoadingError, sheets]);

  useEffect(() => {
    fetchFunctions();

    return () => {
      setData([]);
    };
  }, [currentSheetContent, fetchFunctions]);

  return {
    functions: data,
    getFunctions: fetchFunctions,
  };
}
