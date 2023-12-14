import { getDataScroller } from './moveViewport';

export function scrollPage(direction: 'up' | 'down') {
  const gridDataScroller = getDataScroller();

  if (!gridDataScroller) return;

  const height = gridDataScroller.clientHeight;

  gridDataScroller.scrollTop += direction === 'up' ? -height : height;
}
