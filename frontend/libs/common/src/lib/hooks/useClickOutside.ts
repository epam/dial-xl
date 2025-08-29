import { RefObject, useEffect } from 'react';

export const useClickOutside = (
  ref: RefObject<HTMLDivElement>,
  callback: (e: MouseEvent) => void,
  events: ('click' | 'mousedown' | 'contextmenu' | 'dblclick')[] = [
    'click',
    'contextmenu',
  ],
  contextMenuCheckEnabled = false
) => {
  const handleClick = (e: MouseEvent) => {
    // Click on custom Context Menu submenu items (e.g. Filters) should not close the context menu
    // Custom submenus consist of many elements, but stopPropagation set only on the root element
    if (contextMenuCheckEnabled) {
      let el = e.target as HTMLElement;

      while (el) {
        if (el.dataset?.stopPropagation) return;
        el = el.parentElement as HTMLElement;
      }
    }

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
