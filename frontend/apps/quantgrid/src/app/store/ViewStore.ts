import isEqual from 'react-fast-compare';
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

import { ViewportInteractionMode } from '@frontend/common';

import { SelectedCell } from '../common';

export type ViewState = {
  viewportInteractionMode: ViewportInteractionMode;
  selectedCell: SelectedCell | null;
};

export type ViewActions = {
  setViewportInteractionMode: (m: ViewportInteractionMode) => void;
  updateSelectedCell: (selectedCell: SelectedCell | null) => void;
};

export type ViewStore = ViewState & ViewActions;

export const useViewStore = create<ViewStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        viewportInteractionMode: 'select',
        setViewportInteractionMode: (m) => set({ viewportInteractionMode: m }),

        selectedCell: null,
        updateSelectedCell: (updatedSelectedCell: SelectedCell | null) => {
          const { selectedCell } = get();
          if (isEqual(selectedCell, updatedSelectedCell)) return;

          set({ selectedCell: updatedSelectedCell });
        },
      }),
      {
        name: 'view',
        partialize: () => ({}),
      },
    ),
  ),
);
