import { createContext, RefObject } from 'react';

import { LayoutContextActions } from '../LayoutContext';

export interface CommonContextValues {
  layoutContext?: Partial<
    Pick<
      LayoutContextActions,
      'closeAllPanels' | 'expandedPanelSide' | 'collapseExpandedPanelSide'
    >
  >;
}

type ContextValues = { sharedRef: RefObject<CommonContextValues> };

export const CommonContext = createContext<ContextValues>({} as ContextValues);
