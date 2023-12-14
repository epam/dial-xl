import { createContext, ReactNode, useCallback, useState } from 'react';

type AppContextActions = {
  updateZoom: (newZoom: number) => void;
  updateZoomWithWheel: (direction: number) => void;

  loading: boolean;
  setLoading: (loading: boolean) => void;
  hideLoading: (timeout?: number) => void;
};

type AppContextValues = {
  zoom: number;
};

export const AppContext = createContext<AppContextActions & AppContextValues>(
  {} as AppContextActions & AppContextValues
);

type Props = {
  children: ReactNode;
};

export const zoomValues = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function AppContextProvider({ children }: Props) {
  const [zoom, setZoom] = useState(getInitialZoom());
  const [loading, setLoading] = useState(true);

  const updateZoom = useCallback((newZoom: number) => {
    if (!zoomValues.some((z) => z === newZoom))
      throw new Error('[AppContext] Invalid zoom value');
    setZoom(newZoom);
    saveZoom(newZoom);
  }, []);

  const updateZoomWithWheel = useCallback(
    (direction: number) => {
      const currentZoomIndex = zoomValues.findIndex((z) => z === zoom);
      const nextZoomIndex = currentZoomIndex + direction;

      if (nextZoomIndex < 0 || nextZoomIndex >= zoomValues.length) return;

      updateZoom(zoomValues[nextZoomIndex]);
    },
    [updateZoom, zoom]
  );

  const hideLoading = (timeout = 300) => {
    setTimeout(() => {
      setLoading(false);
    }, timeout);
  };

  return (
    <AppContext.Provider
      value={{
        zoom,
        updateZoom,
        updateZoomWithWheel,
        loading,
        setLoading,
        hideLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

function getInitialZoom() {
  const zoom = localStorage.getItem('zoom');

  if (!zoom || !zoomValues.includes(Number(zoom))) return 1;

  return Number(zoom);
}

function saveZoom(zoom: number) {
  localStorage.setItem('zoom', String(zoom));
}
