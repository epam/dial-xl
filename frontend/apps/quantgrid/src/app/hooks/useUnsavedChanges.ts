import { useEffect } from 'react';

export const useUnsavedChanges = (condition: boolean) => {
  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      if (!condition) return;

      event.preventDefault();

      event.returnValue = true;
    };

    window.addEventListener('beforeunload', listener);

    return () => window.removeEventListener('beforeunload', listener);
  }, [condition]);
};
