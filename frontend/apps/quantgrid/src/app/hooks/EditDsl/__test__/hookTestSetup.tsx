import { useContext, useEffect } from 'react';

import { renderHook, RenderHookResult } from '@testing-library/react';

import { createWrapper, DslContext } from './createWrapper';

interface HookTestSetup<T> {
  result: RenderHookResult<T, { dsl: string }>['result'];
  rerender: (props?: { dsl: string }) => void;
  setDsl: (dsl: string) => void;
}

/**
 * Reusable function to setup and render a hook for testing.
 * @param hook - The hook to test.
 * @param initialProps - Initial props for the wrapper.
 * @param initialDsl - Initial DSL to set in the context.
 * @returns An object containing `result`, `rerender`, and `setDsl`.
 */
export function hookTestSetup<T>(
  hook: () => T,
  initialProps: Record<string, any> = {},
  initialDsl = ''
): HookTestSetup<T> {
  const wrapper = createWrapper(initialProps);

  const hookRender = renderHook(
    ({ dsl }) => {
      const context = useContext(DslContext);
      if (!context) throw new Error('DslContext is not available');

      useEffect(() => {
        context.setDsl(dsl);
      }, [context, dsl]);

      return hook();
    },
    { wrapper, initialProps: { dsl: initialDsl } }
  );

  return {
    result: hookRender.result,
    rerender: hookRender.rerender,
    setDsl: (dsl: string) => hookRender.rerender({ dsl }),
  };
}
