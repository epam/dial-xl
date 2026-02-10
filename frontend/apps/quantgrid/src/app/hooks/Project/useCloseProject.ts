import { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { LongCalcStatuses } from '../../common';
import {
  ProjectResourceContext,
  ProjectSessionContext,
  ProjectSubscriptionContext,
} from '../../context';
import { routes } from '../../types';

export function useCloseProject() {
  const navigate = useNavigate();
  const res = useContext(ProjectResourceContext)!;
  const ses = useContext(ProjectSessionContext)!;
  const sub = useContext(ProjectSubscriptionContext)!;

  return useCallback(
    (skipNavigate?: boolean) => {
      ses.setParsedSheet(null);
      ses.setParsedSheets({});
      res.setProjectState(null);

      res.setProjectPermissions([]);
      sub.unsubscribeFromCurrentProject();
      ses.cancelAllViewportRequests();
      ses.setBeforeTemporaryState(null);
      ses.setIsTemporaryState(false);
      ses.setIsTemporaryStateEditable(false);
      res.setLongCalcStatus(LongCalcStatuses.None);

      res.remoteEtag.current = null;
      res.inflightRequest.current = null;
      res.localDsl.current = null;
      res.inflightDsl.current = null;

      if (!skipNavigate) navigate(routes.home);
    },
    [res, ses, sub, navigate]
  );
}
