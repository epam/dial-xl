import { useEffect, useRef, useState } from 'react';

type Options = {
  delay?: number;
  minDuration?: number;
};

export function useBusyIndicator(
  isBusy: boolean,
  { delay = 300, minDuration = 250 }: Options = {},
) {
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const visibleSince = useRef<number | null>(null);

  useEffect(() => {
    const clear = () => {
      if (showTimer.current) {
        window.clearTimeout(showTimer.current);
        showTimer.current = null;
      }
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };

    if (isBusy) {
      clear();
      if (!visible) {
        showTimer.current = window.setTimeout(() => {
          setVisible(true);
          visibleSince.current = Date.now();
          showTimer.current = null;
        }, delay);
      }
    } else {
      if (!visible) {
        if (showTimer.current) {
          window.clearTimeout(showTimer.current);
          showTimer.current = null;
        }
      } else {
        const elapsed = visibleSince.current
          ? Date.now() - visibleSince.current
          : 0;
        const remain = Math.max(0, minDuration - elapsed);
        hideTimer.current = window.setTimeout(() => {
          setVisible(false);
          visibleSince.current = null;
          hideTimer.current = null;
        }, remain);
      }
    }

    return clear;
  }, [isBusy, delay, minDuration, visible]);

  return visible;
}
