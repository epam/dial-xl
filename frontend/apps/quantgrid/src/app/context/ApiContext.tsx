import { Modal } from 'antd';
import {
  createContext,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import useWebSocket from 'react-use-websocket';

import { ClientRequest } from '@frontend/common';

import { ApiAction } from '../common';
import useEventBus from '../hooks/useEventBus';
import { EventBusMessages, getApiUrl, uniqueId } from '../services';

const toastErrorId = 'ws-error';
const pingTimeout = 20 * 1000;

type ApiContextActions = {
  isConnectionOpened: boolean;
  switchConnectionStatus: (status: boolean) => void;
  addRequestId: (requestId: string, action: ApiAction) => void;
  removeRequestId: (requestId: string) => void;
  findByRequestId: (requestId: string, isDelete: boolean) => ApiAction | null;
  sendMessage: (message: string) => void;
  send: (
    data: ClientRequest,
    versionDependent: boolean,
    apiAction?: ApiAction
  ) => void;
};

type ApiContextValues = {
  projectVersionRef: MutableRefObject<number | null>;
};

export const ApiContext = createContext<ApiContextActions & ApiContextValues>(
  {} as ApiContextActions & ApiContextValues
);

export function ApiContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { publish } = useEventBus<EventBusMessages>();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const requestMapping = useRef<Map<string, ApiAction>>(new Map());
  const [isConnectionOpened, setIsConnectionOpened] = useState(true);

  const projectVersionRef = useRef<number | null>(null);

  const switchConnectionStatus = useCallback((status: boolean) => {
    if (status === false) {
      // We should null the version when connection is lost
      projectVersionRef.current = null;
    }
    setIsConnectionOpened(status);
  }, []);

  const addRequestId = useCallback((requestId: string, action: ApiAction) => {
    requestMapping.current = new Map(
      requestMapping.current.set(requestId, action)
    );
  }, []);

  const removeRequestId = useCallback((requestId: string) => {
    const updatedMap = new Map(requestMapping.current);
    updatedMap.delete(requestId);
    requestMapping.current = updatedMap;
  }, []);

  const findByRequestId = useCallback(
    (requestId: string, isDelete = false) => {
      const action = requestMapping.current.get(requestId);

      if (!action) return null;

      if (isDelete) {
        removeRequestId(requestId);
      }

      return action;
    },
    [removeRequestId]
  );

  const handleMessage = useCallback(
    (message: MessageEvent) => {
      publish({
        topic: 'ApiResponse',
        payload: { data: message.data },
      });
    },
    [publish]
  );

  const { sendMessage } = useWebSocket(
    getApiUrl(),
    {
      share: true,
      retryOnError: true,
      onError: () => {
        toast.error(<p>There was a network error.</p>, {
          toastId: toastErrorId,
        });
        switchConnectionStatus(false);
        setIsModalOpen(true);
      },
      shouldReconnect: () => true,
      onOpen: () => switchConnectionStatus(true),
      onMessage: handleMessage,
      heartbeat: {
        message: JSON.stringify({ ping: {} }),
        returnMessage: JSON.stringify({ pong: {} }),
        interval: pingTimeout,
        timeout: pingTimeout * 3,
      },
    },
    isConnectionOpened
  );

  const send = useCallback(
    (data: ClientRequest, versionDependent: boolean, apiAction?: ApiAction) => {
      const id = uniqueId();

      if (versionDependent && projectVersionRef.current !== null) {
        (data as any)[Object.keys(data)[0]].version = projectVersionRef.current;

        projectVersionRef.current++;
      }

      if (apiAction !== undefined) {
        addRequestId(id, apiAction);
      }

      sendMessage(
        JSON.stringify({
          ...data,
          id,
        })
      );
    },
    [addRequestId, sendMessage]
  );

  const value = useMemo(
    () => ({
      addRequestId,
      removeRequestId,
      findByRequestId,
      isConnectionOpened,
      switchConnectionStatus,
      sendMessage,
      projectVersionRef,
      send,
    }),
    [
      addRequestId,
      removeRequestId,
      findByRequestId,
      isConnectionOpened,
      switchConnectionStatus,
      sendMessage,
      send,
    ]
  );

  return (
    <ApiContext.Provider value={value}>
      {children}

      <Modal
        okButtonProps={{
          className: 'bg-blue-500 enabled:hover:bg-blue-700',
        }}
        open={isModalOpen}
        title="Would you like to try to reconnect?"
        onCancel={() => {
          setIsModalOpen(false);
        }}
        onOk={() => {
          switchConnectionStatus(true);
          setIsModalOpen(false);
        }}
      />
    </ApiContext.Provider>
  );
}
