import { Button } from 'antd';
import { useContext, useEffect, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  ClockExclamationIcon,
  ExecutionType,
  Profile,
  secondaryButtonClasses,
} from '@frontend/common';

import { ViewportContext } from '../../context';

export const IndexNotification = () => {
  const { viewGridData } = useContext(ViewportContext);

  const [isIndexComputing, setIsIndexComputing] = useState(false);
  const [isNotificationClosed, setIsNotificationClosed] = useState(false);

  useEffect(() => {
    const subscription = viewGridData.profileUpdate$.subscribe(
      (profiles: Profile[]) => {
        const requests = viewGridData.getRequests();
        // We need to keep notification if connections still running but no index
        if (requests.length && !profiles.length) return;

        setIsIndexComputing(
          profiles.some((p) => p.type === ExecutionType.INDEX)
        );

        if (profiles.length === 0) {
          setIsNotificationClosed(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [viewGridData]);

  if (!isIndexComputing || isNotificationClosed) return null;

  return (
    <div className="absolute max-h-full max-w-[800px] w-full bottom-0 left-1/2 flex justify-center">
      <div className="relative -left-1/2 grow p-3">
        <div className="rounded bg-bg-accent-primary flex flex-col gap-3 p-3">
          <div className="flex gap-3">
            <Icon
              className="text-white w-[24px] shrink-0"
              component={() => <ClockExclamationIcon />}
            />
            <span className="text-white text-sm">
              You have index computing. Answers from assistant can be inaccurate
            </span>
          </div>
          <Button
            className={secondaryButtonClasses}
            onClick={() => setIsNotificationClosed(true)}
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};
