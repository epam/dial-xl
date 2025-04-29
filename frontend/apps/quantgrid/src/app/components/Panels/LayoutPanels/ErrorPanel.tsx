import { PanelProps } from '../../../common';
import { Errors } from '../Errors';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

export function ErrorPanel({
  panelName,
  title,
  position,
  isActive,
}: PanelProps) {
  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar panelName={panelName} position={position} title={title} />
      <Errors />
    </PanelWrapper>
  );
}
