import { useContext, useEffect, useState } from 'react';

import { RuntimeError } from '@frontend/common';

import { ViewportContext } from '../../context';

export function useRuntimeErrors() {
  const { viewGridData } = useContext(ViewportContext);

  const [runtimeErrors, setRuntimeErrors] = useState<RuntimeError[] | null>(
    null
  );

  useEffect(() => {
    const handleDataUpdate = () => {
      const runtimeErrors = viewGridData.getRuntimeErrors();
      setRuntimeErrors(runtimeErrors.length > 0 ? runtimeErrors : null);
    };

    handleDataUpdate();

    const dataUpdateSubscription =
      viewGridData.shouldUpdate$.subscribe(handleDataUpdate);

    return () => {
      dataUpdateSubscription.unsubscribe();
    };
  }, [viewGridData]);

  return {
    runtimeErrors,
    setRuntimeErrors,
  };
}
