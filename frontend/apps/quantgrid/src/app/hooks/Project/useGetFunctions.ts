import { useCallback, useEffect, useRef, useState } from 'react';

import { FunctionInfo, WorksheetState } from '@frontend/common';

import { useApiRequests } from '../useApiRequests';

type Props = {
  currentSheetContent: string | null;
  sheets?: WorksheetState[];
};

export function useGetFunctions({ currentSheetContent, sheets }: Props) {
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

    const worksheets = sheets.reduce((acc, curr) => {
      acc[curr.sheetName] = curr.content;

      return acc;
    }, {} as Record<string, string>);

    const resp = await apiGetFunctions({ worksheets });

    if (id !== reqIdRef.current) return;

    setData(resp ?? []);
  }, [apiGetFunctions, sheets]);

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
