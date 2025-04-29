import { PanelProps } from '../../../common';
import { Chart } from '../Chart';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

export function ChartPanel({
  panelName,
  title,
  position,
  isActive,
}: PanelProps) {
  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar panelName={panelName} position={position} title={title} />
      <Chart />
    </PanelWrapper>
  );
}
