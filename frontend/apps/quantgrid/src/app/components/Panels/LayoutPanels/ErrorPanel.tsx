import { PanelProps } from '../../../common';
import { Errors } from '../Errors';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

export function ErrorPanel({ panelName, title, position }: PanelProps) {
  return (
    <PanelWrapper>
      <PanelToolbar panelName={panelName} position={position} title={title} />
      <Errors />
    </PanelWrapper>
  );
}
