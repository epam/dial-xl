import { useCallback } from 'react';

export const useSafeCallback = <T extends (...args: any[]) => any>(
  callback: T
): T => {
  return useCallback(
    ((...args: Parameters<T>) => {
      try {
        const result = callback(...args);
        if (result instanceof Promise) {
          return result.catch((e) => {
            // eslint-disable-next-line no-console
            console.error(e);

            return undefined as ReturnType<T>;
          });
        }

        return result;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);

        return undefined as ReturnType<T>;
      }
    }) as T,
    [callback]
  );
};
