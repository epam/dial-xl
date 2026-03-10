import { useCallback, useContext } from 'react';

import {
  ImportColumn,
  ImportSchema,
  ImportSync,
  parseSSEResponse,
} from '@frontend/common';

import { ProjectContext } from '../../context';
import { useApiRequests } from '../useApiRequests';

export type OnSSEHandler<T> = (e: {
  token?: string;
  data?: unknown;
}) => { done?: boolean; result?: T } | void;

interface RunImportSyncOptions<T> {
  onSSE?: OnSSEHandler<T>;
  onStartError?: () => T;
  params: {
    project: string;
    source: string;
    dataset: string;
    schema: ImportSchema;
  };
}

export const useRunImportSync = () => {
  const { manageRequestLifecycle } = useContext(ProjectContext);
  const { startImportSync } = useApiRequests();

  const runImportSync = useCallback(
    async <T>({
      params,
      onSSE,
      onStartError,
    }: RunImportSyncOptions<T>): Promise<T | undefined> => {
      const { project, source, dataset, schema } = params;
      const controller = new AbortController();
      manageRequestLifecycle('start', 'importSync', controller);

      try {
        const response = await startImportSync({
          project,
          source,
          dataset,
          schema,
          controller,
        });
        if (!response) {
          return onStartError?.();
        }

        if (!onSSE) return undefined;

        return await new Promise<T | undefined>((resolve, reject) => {
          let finalResult: T | undefined;
          let finished = false;

          parseSSEResponse(
            response,
            {
              tolerant: true,
              stopOnDone: true,
              onControl: (token) => {
                if (finished) return;
                const out = onSSE?.({ token });
                if (out?.done) {
                  finished = true;
                  finalResult = out.result;
                }
              },
              onData: (data: unknown) => {
                if (finished) return;
                const out = onSSE?.({ data });
                if (out?.done) {
                  finished = true;
                  finalResult = out.result;
                }
              },
            },
            controller,
          )
            .then(() => resolve(finalResult))
            .catch(reject);
        });
      } finally {
        manageRequestLifecycle('end', 'importSync', controller);
      }
    },
    [manageRequestLifecycle, startImportSync],
  );

  return {
    runImportSync,
  };
};

interface GetImportVersionOptions {
  onSchemaOnce?: (cols: Record<string, ImportColumn>) => void;
  doneIsNull?: boolean;
}

type ImportSyncEvent = { importSync?: ImportSync };

export function getImportVersionFromSSE(
  opts: GetImportVersionOptions = {},
): OnSSEHandler<number | null> {
  const { onSchemaOnce, doneIsNull = true } = opts;
  let schemaCaptured = false;

  return ({ token, data }) => {
    if (token === '[ERROR]') {
      return { done: true, result: null };
    }
    if (token === '[DONE]' && doneIsNull) {
      return { done: true, result: null };
    }

    const evt = data as ImportSyncEvent | undefined;
    const isFailed = evt?.importSync?.status === 'FAILED';
    if (isFailed) {
      return { done: true, result: null };
    }

    const cols = evt?.importSync?.schema?.columns as
      | Record<string, ImportColumn>
      | undefined;
    if (cols && onSchemaOnce && !schemaCaptured) {
      schemaCaptured = true;
      onSchemaOnce(cols);
    }

    const v = evt?.importSync?.version;
    if (v != null) {
      const n = Number.parseInt(String(v), 10);
      if (Number.isFinite(n)) {
        return { done: true, result: n };
      }
    }

    return;
  };
}
