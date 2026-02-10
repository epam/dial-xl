import { useCallback, useEffect, useState } from 'react';

import { CollapseSection } from './types';

const storageKey = 'projectPanelActiveKeys';
const defaultSections: CollapseSection[] = [
  CollapseSection.ProjectTree,
  CollapseSection.Conversations,
  CollapseSection.Hints,
  CollapseSection.Inputs,
];

export function useProjectPanelCollapse(): [
  CollapseSection[],
  (section: CollapseSection) => void
] {
  const [activeKeys, setActiveKeys] = useState<CollapseSection[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);

      return raw ? (JSON.parse(raw) as CollapseSection[]) : defaultSections;
    } catch {
      return defaultSections;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(activeKeys));
    } catch {
      // empty section
    }
  }, [activeKeys]);

  const toggleSection = useCallback((section: CollapseSection) => {
    setActiveKeys((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  }, []);

  return [activeKeys, toggleSection];
}
