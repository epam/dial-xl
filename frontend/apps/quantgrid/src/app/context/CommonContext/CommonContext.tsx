import { createContext, MutableRefObject } from 'react';

import { LayoutContextActions } from '../LayoutContext';

export interface CommonContextValues {
  layoutContext?: Partial<Pick<LayoutContextActions, 'closeAllPanels'>>;
}

type ContextValues = { sharedRef: MutableRefObject<CommonContextValues> };

export const CommonContext = createContext<ContextValues>({} as ContextValues);
