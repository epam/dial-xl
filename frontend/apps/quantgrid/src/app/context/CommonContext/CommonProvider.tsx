import { ReactNode, useRef } from 'react';

import { CommonContext, CommonContextValues } from './CommonContext';

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
