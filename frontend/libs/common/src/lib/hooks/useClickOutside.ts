import { RefObject, useEffect } from 'react';

export const useClickOutside = (
  ref: RefObject<HTMLDivElement>,
  callback: (e: MouseEvent) => void,
  events: ('click' | 'mousedown' | 'contextmenu' | 'dblclick')[] = [
    'click',
    'contextmenu',
  ]
) => {
  const handleClick = (e: MouseEvent) => {
    // Context menu submenu item
    if ((e.target as any).dataset?.stopPropagation) return;

    if (ref.current && !ref.current.contains(e.target as any)) {
      callback(e);
    }
  };
  useEffect(() => {
    events.forEach((event) => {
      document.addEventListener(event, handleClick, true);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleClick, true);
      });
    };
  });
};
