import { useLayoutEffect, useState } from 'react';

import {
  projectPanelSectionHeaderClass,
  projectPanelWrapperId,
} from '@frontend/common';

export function useTreeHeight() {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const container = document.getElementById(projectPanelWrapperId);
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const wrapper = document.getElementById(projectPanelWrapperId);
      const headers = document.querySelectorAll(
        `.${projectPanelSectionHeaderClass}`
      );

      if (!wrapper || !headers.length) {
        setHeight(window.innerHeight);

        return;
      }

      const headerHeight = Array.from(headers).reduce((acc, header) => {
        const element = header as HTMLElement;

        return acc + (element.offsetHeight || 0);
      }, 0);

      setHeight(wrapper.offsetHeight - headerHeight);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  return height;
}
