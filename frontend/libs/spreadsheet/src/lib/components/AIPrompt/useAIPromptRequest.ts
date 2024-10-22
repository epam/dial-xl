import { useCallback, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';

import { Message, Role } from '@epam/ai-dial-overlay';
import { mergeMessages, parseSSEResponse } from '@frontend/common';

export const useAIPromptRequests = ({
  systemPrompt,
  onResponseUpdate,
}: {
  systemPrompt: string;
  onResponseUpdate: (currentMessage: Message, isFinish?: boolean) => void;
}) => {
  const auth = useAuth();
  const controllerRef = useRef<AbortController>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout>>();
  const isTimeoutRef = useRef(false);

  const sendDialRequest = useCallback(
    (
      path: string,
      params?: Omit<RequestInit, 'headers'> & {
        headers?: Record<string, string>;
      }
    ) => {
      const headers = params?.headers || {};

      if (auth.user?.access_token) {
        headers['Authorization'] = `Bearer ${auth.user?.access_token}`;
      }

      const fullPath = (window as any).externalEnv.dialBaseUrl + path;
      const controller = new AbortController();
      controllerRef.current = controller;

      return fetch(fullPath, { ...params, headers, signal: controller.signal });
    },
    [auth]
  );

  const handleClearTimeout = useCallback(() => {
    if (!timeoutIdRef.current) return;

    clearInterval(timeoutIdRef.current);
    timeoutIdRef.current = undefined;
  }, []);

  const sendRequest = useCallback(
    async ({
      userMessage,
    }: {
      userMessage: Message;
    }): Promise<Message | undefined> => {
      try {
        setIsLoading(true);

        const messages: Message[] = [
          {
            content: systemPrompt,
            role: Role.System,
          },
          userMessage,
        ];
        const res = await sendDialRequest(
          `/openai/deployments/qg/chat/completions?api-version=2024-02-15-preview`,
          {
            body: JSON.stringify({ stream: true, ...messages }),
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!res || !res.ok) throw new Error();

        let responseMessage: Message = {
          role: Role.Assistant,
          content: '',
        };
        await parseSSEResponse(res, {
          onData: (parsedData) => {
            const newMessage = mergeMessages(responseMessage, [
              parsedData.choices[0].delta,
            ]);

            responseMessage = newMessage;
            onResponseUpdate(responseMessage);

            handleClearTimeout();
            timeoutIdRef.current = setTimeout(() => {
              if (controllerRef.current?.signal.aborted) return;

              isTimeoutRef.current = true;
              controllerRef.current?.abort();
            }, 20000);
          },
        });

        setIsLoading(false);
        handleClearTimeout();

        return responseMessage;
      } catch (e) {
        setIsLoading(false);
        handleClearTimeout();

        if (
          e instanceof DOMException &&
          e.name === 'AbortError' &&
          !isTimeoutRef.current
        ) {
          return;
        }

        setIsError(true);

        return;
      }
    },
    [handleClearTimeout, onResponseUpdate, sendDialRequest, systemPrompt]
  );

  const stopRequest = useCallback(() => {
    if (!controllerRef.current?.signal.aborted) {
      controllerRef.current?.abort();
    }
  }, []);

  const resetRequestResults = useCallback(() => {
    setIsLoading(false);
    setIsError(false);
  }, []);

  return {
    isLoading,
    isError,
    sendRequest,
    stopRequest,
    resetRequestResults,
  };
};
