type GridViewportSubscriberCallback = (deltaX: number, deltaY: number) => void;

export class GridViewportSubscriber {
  private callbacks: Set<GridViewportSubscriberCallback>;

  constructor() {
    this.callbacks = new Set();
  }

  public subscribe(callback: GridViewportSubscriberCallback): () => void {
    this.callbacks.add(callback);

    // Return an unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  public changeViewport(deltaX: number, deltaY: number): void {
    this.callbacks.forEach((callback) => {
      callback(deltaX, deltaY);
    });
  }
}
