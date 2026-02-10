import { Arrow } from './Arrow';
import { Thumb } from './Thumb';
import { Track } from './Track';

type Props = {
  zIndex: number;
};

export function ScrollBar({ zIndex }: Props) {
  return (
    <pixiContainer label="ScrollBar" zIndex={zIndex}>
      <Track direction="vertical" />
      <Track direction="horizontal" />
      <Thumb direction="vertical" />
      <Thumb direction="horizontal" />
      <Arrow place="left" />
      <Arrow place="right" />
      <Arrow place="up" />
      <Arrow place="down" />
    </pixiContainer>
  );
}
