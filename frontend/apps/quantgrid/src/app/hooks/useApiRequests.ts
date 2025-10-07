import { useContext } from 'react';
import { useAuth } from 'react-oidc-context';

import { ApiContext } from '../context';
import {
  useAIHintsRequests,
  useBackendRequest,
  useFileResourceRequests,
  useProjectRequests,
  useQGRequests,
  useResourceRequests,
} from './ApiRequests';

// TODO: try to pass auth and user bucket to have pure hook without state
// Hook just for getting data, but handling data will be on calling side
export const useApiRequests = () => {
  const auth = useAuth();
  const { userBucket } = useContext(ApiContext);

  const { sendDialRequest, getDialBucket } = useBackendRequest(auth);

  const qgRequests = useQGRequests(auth);
  const AIHintsRequests = useAIHintsRequests(auth);
  const resourcesRequests = useResourceRequests(auth);
  const filesResourcesRequests = useFileResourceRequests(auth, userBucket);
  const projectRequests = useProjectRequests(auth, userBucket);

  return {
    sendDialRequest,
    getDialBucket,

    ...qgRequests,
    ...AIHintsRequests,
    ...resourcesRequests,
    ...filesResourcesRequests,

    ...projectRequests,
  };
};
