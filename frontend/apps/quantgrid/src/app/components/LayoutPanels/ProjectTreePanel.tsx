import { PanelProps } from '../../common';
import { PanelToolbar } from '../PanelToolbar';
import { ProjectTree } from '../ProjectTree';
import { PanelWrapper } from './PanelWrapper';

export function ProjectTreePanel({ panelName, title, position }: PanelProps) {
  return (
    <PanelWrapper>
      <PanelToolbar panelName={panelName} position={position} title={title} />
      <ProjectTree />
    </PanelWrapper>
  );
}
