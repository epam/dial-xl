import isEqual from 'react-fast-compare';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ViewportInteractionMode, zoomValues } from '@frontend/common';

import { SelectedCell } from '../common';

type ZoomValue = (typeof zoomValues)[number];
const defaultZoom: ZoomValue = 1;
const zoomStorageKey = 'zoom';

export type ViewState = {
  zoom: ZoomValue;
  viewportInteractionMode: ViewportInteractionMode;
  selectedCell: SelectedCell | null;
};

export type ViewActions = {
  setZoom: (z: number) => void;
  updateZoomWithWheel: (direction: number) => void;
  setViewportInteractionMode: (m: ViewportInteractionMode) => void;
  updateSelectedCell: (selectedCell: SelectedCell | null) => void;
};

export type ViewStore = ViewState & ViewActions;

function coerceZoom(z: number): ZoomValue {
  return (zoomValues.includes(z as ZoomValue) ? z : defaultZoom) as ZoomValue;
}

export const useViewStore = create<ViewStore>()(
  persist(
    (set, get) => ({
      zoom: coerceZoom(
        Number(localStorage.getItem(zoomStorageKey)) || defaultZoom
      ),

      setZoom: (z) => {
        const nz = coerceZoom(z);
        set({ zoom: nz });
        localStorage.setItem(zoomStorageKey, String(nz));
      },

      updateZoomWithWheel: (direction) => {
        const { zoom, setZoom } = get();
        const idx = zoomValues.findIndex((v) => v === zoom);
        const next = idx + direction;
        if (next < 0 || next >= zoomValues.length) return;
        setZoom(zoomValues[next]);
      },

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
      partialize: (s) => ({ zoom: s.zoom }),
    }
  )
);
