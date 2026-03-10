import { useCallback } from 'react';

import { shallowEqualArray, useSettingState } from '../../../../hooks';
import {
  defaultProjectPanelSections,
  ProjectPanelCollapseSection as CollapseSection,
} from '../../../../utils';

export function useProjectPanelCollapse(): [
  CollapseSection[],
  (section: CollapseSection) => void,
] {
  const [activeKeys, setActiveKeys] = useSettingState(
    'projectPanelActiveKeys',
    {
      fallback: defaultProjectPanelSections,
      equals: shallowEqualArray,
    },
  );

  const toggleSection = useCallback(
    (section: CollapseSection) => {
      setActiveKeys(
        (prev) =>
          prev.includes(section)
            ? prev.filter((s) => s !== section)
            : [...prev, section],
        true,
      );
    },
    [setActiveKeys],
  );

  return [activeKeys, toggleSection];
}
