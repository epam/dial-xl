import { PanelProps } from '../../common';
import { PanelToolbar } from '../PanelToolbar';
import { UndoRedo } from '../UndoRedo';
import { PanelWrapper } from './PanelWrapper';

export const UndoRedoPanel = ({ panelName, title, position }: PanelProps) => {
  return (
    <PanelWrapper>
      <PanelToolbar panelName={panelName} position={position} title={title} />
      <UndoRedo />
    </PanelWrapper>
  );
};
