import { PanelProps } from '../../../common';
import { Inputs } from '../Inputs';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

export function InputsPanel({
  panelName,
  title,
  position,
  isActive,
}: PanelProps) {
  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar panelName={panelName} position={position} title={title} />
      <Inputs />
    </PanelWrapper>
  );
}
