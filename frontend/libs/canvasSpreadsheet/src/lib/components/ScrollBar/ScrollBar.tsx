import { Container } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { Arrow } from './Arrow';
import { Thumb } from './Thumb';
import { Track } from './Track';

export function ScrollBar() {
  return (
    <Container zIndex={ComponentLayer.ScrollBar}>
      <Track direction="vertical" />
      <Track direction="horizontal" />
      <Thumb direction="vertical" />
      <Thumb direction="horizontal" />
      <Arrow place="left" />
      <Arrow place="right" />
      <Arrow place="up" />
      <Arrow place="down" />
    </Container>
  );
}
