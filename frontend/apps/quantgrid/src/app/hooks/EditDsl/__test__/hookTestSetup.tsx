import { useContext } from 'react';

import { act, renderHook, RenderHookResult } from '@testing-library/react';

import { DslContext } from './createWrapper';

interface HookTestSetup<T> {
  result: RenderHookResult<T, unknown>['result'];
  setDsl: (dsl: string) => void;
  rerender: (props?: unknown) => void;
}
/**
 * Reusable function to set up and render a hook for testing.
 * @param hook - The hook to test.
 * @param wrapper - The wrapper component providing necessary context.
 * @returns An object containing `result`, `rerender`, and `setDsl`.
 */
export function hookTestSetup<T>(
  hook: () => T,
  wrapper: React.ComponentType<React.PropsWithChildren<unknown>>
): HookTestSetup<T> {
  let setDslFn: (dsl: string) => void = () => {};

  const hookRender = renderHook(
    () => {
      const ctx = useContext(DslContext);
      if (!ctx) throw new Error('DslContext is not available');

      setDslFn = ctx.setDsl;

      return hook();
    },
    { wrapper }
  );

  return {
    result: hookRender.result,
    setDsl: (dsl: string) => act(() => setDslFn(dsl)),
    rerender: hookRender.rerender,
  };
}
