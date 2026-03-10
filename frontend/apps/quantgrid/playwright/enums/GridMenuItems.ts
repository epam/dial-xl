import { Orientation } from './Orientation';

export class GridMenuItems {
  private orientation: string;

  public SwapLeft() {
    if (this.orientation === Orientation.Vertical) return 'SwapLeft';
    if (this.orientation === Orientation.Horizontal) return 'SwapTop';

    return '';
  }

  public SwapRight() {
    if (this.orientation === Orientation.Vertical) return 'SwapRight';
    if (this.orientation === Orientation.Horizontal) return 'SwapBottom';

    return '';
  }

  constructor(orientation: string) {
    this.orientation = orientation;
  }
}
