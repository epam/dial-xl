import { useContext } from 'react';

import { AppContext, ChatOverlayContext } from '../../context';
import { IndexNotification } from './IndexNotification';

export function ChatPanelView() {
  const { chatWindowPlacement } = useContext(AppContext);
  const { attachOverlay } = useContext(ChatOverlayContext);

  if (chatWindowPlacement === 'floating') {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      <div
        className="h-full min-w-full w-full"
        ref={(el) => attachOverlay(el)}
      ></div>

      <IndexNotification />
    </div>
  );
}
