import { PanelProps } from '../../../common';
import { ChatPanelView } from '../../ChatWrapper';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

export function ChatPanel({ panelName, title, position }: PanelProps) {
  return (
    <PanelWrapper>
      <PanelToolbar panelName={panelName} position={position} title={title} />
      <ChatPanelView />
    </PanelWrapper>
  );
}
