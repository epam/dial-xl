import { ReactNode, useMemo, useRef } from 'react';

import { ProjectPanelSectionContent } from './ProjectPanelSectionContent';
import { ProjectPanelSectionHeader } from './ProjectPanelSectionHeader';
import { CollapseSection } from './types';

function isElementVisibleInScrollParent(element: HTMLElement) {
  const parent = element.parentElement;
  if (!parent) {
    return false;
  }

  const elementRect = element.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();

  // Check if the element is vertically within the visible bounds of the parent
  const isVisibleTopToBottom =
    elementRect.top >= parentRect.top && elementRect.top <= parentRect.bottom;
  const isVisibleBottomToTop =
    elementRect.bottom >= parentRect.top &&
    elementRect.bottom <= parentRect.bottom;

  return isVisibleTopToBottom && isVisibleBottomToTop;
}

interface Props {
  title: string;
  index: number;
  maxIndex: number;
  content: ReactNode;
  headerExtra?: ReactNode;
  section: CollapseSection;

  activeKeys: CollapseSection[];
  onToggle: () => void;
}

export const ProjectPanelSection = ({
  title,
  index,
  maxIndex,
  content,
  headerExtra,
  section,
  activeKeys,
  onToggle,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  const isCollapsed = useMemo(() => {
    return !activeKeys.includes(section);
  }, [activeKeys, section]);

  return (
    <>
      <div
        ref={ref}
        style={{
          scrollMarginTop: index * 42,
        }}
      ></div>
      <ProjectPanelSectionHeader
        index={index}
        isCollapsed={isCollapsed}
        maxIndex={maxIndex}
        title={title}
        onClick={() => {
          setTimeout(() => {
            if (
              ref.current &&
              (isElementVisibleInScrollParent(ref.current) || isCollapsed)
            ) {
              onToggle();
            }

            setTimeout(() => {
              ref.current?.scrollIntoView({ behavior: 'smooth' });
            }, 160);
          });
        }}
      >
        {headerExtra}
      </ProjectPanelSectionHeader>

      <ProjectPanelSectionContent isCollapsed={isCollapsed}>
        {content}
      </ProjectPanelSectionContent>
    </>
  );
};
