import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useNavigate } from 'react-router';
import { useDebouncedCallback } from 'use-debounce';

import { settingsFileName, settingsFolder } from '@frontend/common';

import { Loader } from '../../components';
import {
  useApiRequests,
  useThemeEffects,
  useWireChatPlacementToUI,
} from '../../hooks';
import { useUserSettingsStore } from '../../store';
import { routes } from '../../types';
import {
  displayToast,
  makeDefaultSettings,
  parseAndMigrateSettings,
  UserSettingsV1,
} from '../../utils';
import { ApiContext } from '../ApiContext';

const saveDebounceMs = 2500;

export function UserSettingsSyncProvider({ children }: PropsWithChildren) {
  const { getSettingsFile, putSettingsFile } = useApiRequests();
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
