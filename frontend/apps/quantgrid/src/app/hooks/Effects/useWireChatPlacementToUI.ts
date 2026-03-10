import { useEffect, useRef } from 'react';

import { useUIStore, useUserSettingsStore } from '../../store';
import { ChatWindowPlacement } from '../../utils';

export function useWireChatPlacementToUI() {
  const lastApplied = useRef<ChatWindowPlacement | null>(null);

  useEffect(() => {
    const apply = (p: ChatWindowPlacement | undefined) => {
      const placement: ChatWindowPlacement =
        p === 'floating' ? 'floating' : 'panel';

      // avoid extra work if unchanged
      if (lastApplied.current === placement) return;
      lastApplied.current = placement;

      const shouldBeOpen = placement === 'floating';
      if (useUIStore.getState().isChatOpen !== shouldBeOpen) {
        useUIStore.setState({ isChatOpen: shouldBeOpen }, false);
      }
    };

    // apply immediately on mount
    apply(useUserSettingsStore.getState().data.chatWindowPlacement);

    const unsub = useUserSettingsStore.subscribe((state, prev) => {
      const placement = state.data.chatWindowPlacement;
      const prevPlacement = prev.data.chatWindowPlacement;

      if (placement !== prevPlacement) {
        apply(placement);
      }
    });

    return () => unsub();
  }, []);
}
