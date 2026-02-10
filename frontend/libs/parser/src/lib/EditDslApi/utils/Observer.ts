import { Event } from './Event';

/**
 * Describes an entity that receives notifications
 * before and after changes occur on an observable node.
 */
export interface Observer {
  /**
   * Called before a node's observed method or property changes.
   *
   * @param event - An Event containing information about the change.
   */
  notifyBefore(event: Event): void;

  /**
   * Called after a node's observed method or property changes.
   *
   * @param event - An Event containing information about the change.
   */
  notifyAfter(event: Event): void;

  /**
   * Inserts or replaces an ObservableNode (`value`) at a given `index` in the `collection`.
   *
   * @param value - The new node to attach (or `null` to remove).
   * @param collection - An array of existing nodes (ObservableNode).
   * @param index - The position to replace, or `null` to append/remove.
   * @returns The final index of `value` in the collection, or `null` if removed.
   */
  setIndexedNode(
    value: ObservableNode | null,
    collection: ObservableNode[],
    index: number | null
  ): number | null;
}

/**
 * Base class for objects that can be observed.
 * It holds a reference to an Observer, allowing
 * notifications before and after specific actions.
 */
export abstract class ObservableNode {
  /**
   * The currently attached Observer, if any.
   */
  protected _observer?: Observer;

  /**
   * Attaches an observer to this node, throwing an error if one is already attached.
   *
   * @param observer - The observer to attach.
   * @throws {Error} If the node is already attached to a parent observer.
   */
  public attach(observer: Observer): void {
    if (this._observer) {
      throw new Error(
        `${this.constructor.name} is already attached to a parent`
      );
    }
    this._observer = observer;
  }

  /**
   * Detaches the currently attached observer, throwing an error if none is attached.
   *
   * @throws {Error} If the node has no currently attached observer.
   */
  public detach(): void {
    if (!this._observer) {
      throw new Error(`${this.constructor.name} is not attached to a parent`);
    }
    this._observer = undefined;
  }

  /**
   * Gets the currently attached observer, if any.
   */
  public get observer(): Observer | undefined {
    return this._observer;
  }
}

/**
 * A convenience class that is both observable and an observer,
 * allowing it to pass events up to its own observer.
 */
export class ObservableObserver extends ObservableNode implements Observer {
  /**
   * Called before a child node's observed method or property changes,
   * then passes the event up to this object's own observer if present.
   *
   * @param event - The event describing the pending change.
   */
  public notifyBefore(event: Event): void {
    if (this._observer) {
      this._observer.notifyBefore(event);
    }
  }

  /**
   * Called after a child node's observed method or property changes,
   * then passes the event up to this object's own observer if present.
   *
   * @param event - The event describing the completed change.
   */
  public notifyAfter(event: Event): void {
    if (this.observer) {
      this.observer.notifyAfter(event);
    }
  }

  /**
   * Inserts or replaces an ObservableNode (`value`) at a given `index` in the `collection`.
   *
   * @param value - The new node to attach (or `null` to remove).
   * @param collection - An array of existing nodes (ObservableNode).
   * @param index - The position to replace, or `null` to append/remove.
   * @returns The final index of `value` in the collection, or `null` if removed.
   */
  public setIndexedNode(
    value: ObservableNode | null,
    collection: ObservableNode[],
    index: number | null
  ): number | null {
    if (value !== null) {
      // Attach the new node to this observer.
      value.attach(this);

      if (index !== null) {
        // Replacing an existing node at `index`.
        collection[index].detach();
        collection[index] = value;
      } else {
        // Appending at the end.
        index = collection.length;
        collection.push(value);
      }

      return index;
    }

    // If `value` is null, remove existing node at `index`.
    if (index !== null) {
      collection[index].detach();
      collection.splice(index, 1);
    }

    return null;
  }
}
