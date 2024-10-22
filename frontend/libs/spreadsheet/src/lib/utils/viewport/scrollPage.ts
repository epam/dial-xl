import { getDataScroller } from '@frontend/common';

export function scrollPage(direction: 'up' | 'down') {
  const gridDataScroller = getDataScroller();

  if (!gridDataScroller) return;

  const height = gridDataScroller.clientHeight;

  gridDataScroller.scrollTop += direction === 'up' ? -height : height;
}
