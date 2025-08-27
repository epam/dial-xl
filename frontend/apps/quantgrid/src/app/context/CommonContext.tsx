import { createContext, MutableRefObject, ReactNode, useRef } from 'react';

import { LayoutContextActions } from './LayoutContext';

interface CommonContextValues {
  layoutContext?: Partial<Pick<LayoutContextActions, 'closeAllPanels'>>;
}

type ContextValues = { sharedRef: MutableRefObject<CommonContextValues> };

export const CommonContext = createContext<ContextValues>({} as ContextValues);

// Special provider to allow call child context method in upper context
// Do not overuse it
export const CommonProvider = ({ children }: { children: ReactNode }) => {
  const sharedRef = useRef<CommonContextValues>({});

  return (
    <CommonContext.Provider value={{ sharedRef }}>
      {children}
    </CommonContext.Provider>
  );
};
