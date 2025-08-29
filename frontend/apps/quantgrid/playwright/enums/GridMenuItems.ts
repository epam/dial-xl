import { Orientation } from './Orientation';

export class GridMenuItems {
  private orientation: string;

  public SwapLeft() {
    if (this.orientation === Orientation.Vertical) return 'Swap left';
    if (this.orientation === Orientation.Horizontal) return 'Swap top';

    return '';
  }

  public SwapRight() {
    if (this.orientation === Orientation.Vertical) return 'Swap right';
    if (this.orientation === Orientation.Horizontal) return 'Swap bottom';

    return '';
  }

  constructor(orientation: string) {
    this.orientation = orientation;
  }
}
