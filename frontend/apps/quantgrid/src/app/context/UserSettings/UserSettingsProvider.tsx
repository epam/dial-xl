import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { useDebouncedCallback } from 'use-debounce';

import {
  parseSSEResponse,
  settingsFileName,
  settingsFolder,
} from '@frontend/common';

import { Loader } from '../../components';
import {
  useApiRequests,
  useThemeEffects,
  useWireChatPlacementToUI,
} from '../../hooks';
import { useUserSettingsStore } from '../../store';
import { routes } from '../../types';
import {
  constructPath,
  displayToast,
  makeDefaultSettings,
  parseAndMigrateSettings,
  UserSettingsV1,
} from '../../utils';
import { ApiContext } from '../ApiContext';

const saveDebounceMs = 2500;

export function UserSettingsSyncProvider({ children }: PropsWithChildren) {
  const { getProjectFileNotifications, getSettingsFile, putSettingsFile } =
    useApiRequests();
  const { userBucket } = useContext(ApiContext);
  const navigate = useNavigate();

  const setHydratedFromServer = useUserSettingsStore(
    (s) => s.setHydratedFromServer,
  );
  const settingsData = useUserSettingsStore((s) => s.data);
  const markSaved = useUserSettingsStore((s) => s.markSaved);
  const markHydrated = useUserSettingsStore((s) => s.markHydrated);
  const dirty = useUserSettingsStore((s) => s.dirty);

  // Limited to 10 items to avoid checking unneeded etags
  const settingsUpdateQueue = useRef<string[]>([]);

  useThemeEffects();
  useWireChatPlacementToUI();

  const settingsFileData = useMemo(
    () => ({
      bucket: userBucket ?? '',
      parentPath: settingsFolder,
      name: settingsFileName,
    }),
    [userBucket],
  );

  const putSettings = useCallback(
    async (payload: UserSettingsV1) => {
      const jsonText = JSON.stringify(payload);
      const res = await putSettingsFile({ ...settingsFileData, jsonText });

      if (!res.success) {
        displayToast('error', res.error.message || 'Failed to save settings');

        return undefined;
      }

      return res.data.etag;
    },
    [putSettingsFile, settingsFileData],
  );

  const initSettings = useDebouncedCallback(async () => {
    if (!userBucket) return;

    const getResult = await getSettingsFile(settingsFileData);

    if (getResult.success) {
      const parsed = parseAndMigrateSettings(getResult.data.text);
      setHydratedFromServer(parsed.settings);

      return;
    }

    if (getResult.error.statusCode === 404) {
      const settings: UserSettingsV1 = {
        ...makeDefaultSettings(),
        settings: settingsData,
      };
      setHydratedFromServer(settings.settings);
      await putSettings(settings);

      return;
    }

    const errorParams = new URLSearchParams({
      error: `Failed to load settings: ${getResult.error.statusCode || 'unknown error'}`,
      redirectTo: window.location.pathname,
    });
    markHydrated();
    navigate(`${routes.error}?${errorParams.toString()}`);
  }, saveDebounceMs);

  const subscribeToSettings = useCallback(async () => {
    const controller = new AbortController();
    const projectUrl = constructPath([
      userBucket,
      settingsFolder,
      settingsFileName,
    ]);

    let attempts = 0;
    let success = false;
    while (attempts < 3 && !success) {
      attempts += 1;
      try {
        const res = await getProjectFileNotifications({
          projectUrl,
          controller,
        });
        if (!res) {
          throw new Error('Failed to subscribe to settings: response missing');
        }

        await parseSSEResponse(
          res,
          {
            onData: (data: { etag: string }) => {
              if (settingsUpdateQueue.current.includes(data.etag)) {
                return;
              }

              initSettings();
            },
          },
          controller,
        );
        success = true;
      } catch (err) {
        if (attempts < 3) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempts)); // backoff
        }
      }
    }
    if (!success) {
      toast.error('Failed to subscribe to settings after 3 attempts.');

      return;
    }

    return controller;
  }, [initSettings, getProjectFileNotifications, userBucket]);

  const saveSettingOnServer = useDebouncedCallback(async () => {
    if (!userBucket) return;

    const { data } = useUserSettingsStore.getState();
    const payload: UserSettingsV1 = { schemaVersion: 1, settings: data };

    const etag = await putSettings(payload);
    if (etag) {
      settingsUpdateQueue.current.push(etag);
      if (settingsUpdateQueue.current.length > 10) {
        settingsUpdateQueue.current.shift();
      }
    }
  }, saveDebounceMs);

  const saveSettings = useCallback(async () => {
    markSaved();

    saveSettingOnServer();
  }, [markSaved, saveSettingOnServer]);

  // SSE subscribe: reload on remote change
  useEffect(() => {
    if (!userBucket) return;

    let controller: AbortController | undefined;

    (async () => {
      controller = await subscribeToSettings();
    })();

    return () => controller?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBucket]);

  // Debounced save on dirty
  useEffect(() => {
    if (!userBucket || !dirty) return;

    saveSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBucket, dirty]);

  // initial load
  useEffect(() => {
    initSettings();
  }, [initSettings, userBucket]);

  return (
    <>
      <Loader />

      {children}
    </>
  );
}
