import { useCallback, useEffect, useRef } from 'react';

import {
  requestWebNotificationsPermissions,
  updateTabFavicon,
  updateTabTitle,
  webNotify,
} from '../../utils';

export const useChatAnsweringTabUpdate = (answerIsGenerating: boolean) => {
  const beginAnswering = useRef(false);
  const dotsAmount = useRef(0);

  const handleResetChatAnswering = useCallback(async () => {
    beginAnswering.current = false;

    dotsAmount.current = 0;
    const isOutOfScreen = document.hidden;

    updateTabTitle((isOutOfScreen ? '● ' : '') + 'DIAL XL');
    updateTabFavicon('favicon.ico', 'image/x-icon');

    // SHow notification only if out of screen
    if (!isOutOfScreen) return;

    await webNotify('Answering finished', {
      body: 'DIAL XL finished answering on your question.',
    });

    return;
  }, []);

  const handleUpdateAnsweringProgress = useCallback(() => {
    beginAnswering.current = true;
    const newDotsAmount = (dotsAmount.current + 1) % 3;

    if (newDotsAmount === dotsAmount.current) return;

    dotsAmount.current = newDotsAmount;
    updateTabTitle('Answering' + '.'.repeat(newDotsAmount + 1));
    updateTabFavicon(
      newDotsAmount === 0
        ? '/faviconProgress/progressFavicon1.png'
        : newDotsAmount === 1
          ? '/faviconProgress/progressFavicon2.png'
          : '/faviconProgress/progressFavicon3.png',
      'image/png',
    );
  }, []);

  useEffect(() => {
    if (!answerIsGenerating && !beginAnswering.current) return;

    requestWebNotificationsPermissions();

    handleUpdateAnsweringProgress();
    const interval = setInterval(() => {
      handleUpdateAnsweringProgress();
    }, 1000);

    return () => {
      clearInterval(interval);

      handleResetChatAnswering();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerIsGenerating]);

  useEffect(() => {
    const listener = function () {
      if (!document.hidden && !answerIsGenerating) {
        updateTabTitle('DIAL XL');
      }
    };

    document.addEventListener('visibilitychange', listener);

    return () => {
      document.removeEventListener('visibilitychange', listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
