import { PanelProps } from '../../common';
import { CodeEditorWrapper } from '../CodeEditorWrapper';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

export function CodeEditorPanel({ panelName, title, position }: PanelProps) {
  return (
    <PanelWrapper>
      <PanelToolbar panelName={panelName} position={position} title={title} />
      <CodeEditorWrapper />
    </PanelWrapper>
  );
}
