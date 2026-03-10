import { useContext } from 'react';

import { ChatOverlayContext } from '../../context';
import { useUserSettingsStore } from '../../store';
import { IndexNotification } from './IndexNotification';

export function ChatPanelView() {
  const chatWindowPlacement = useUserSettingsStore(
    (s) => s.data.chatWindowPlacement,
  );

  const { attachOverlay } = useContext(ChatOverlayContext);

  if (chatWindowPlacement === 'floating') {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      <div
        className="h-full min-w-full w-full"
        ref={(el) => {
          attachOverlay(el);
        }}
      ></div>
      <IndexNotification />
    </div>
  );
}
