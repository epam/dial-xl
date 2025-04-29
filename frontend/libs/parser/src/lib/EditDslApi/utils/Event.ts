import { ObservableNode } from './Observer';

/**
 * Represents an event triggered by an observable node,
 * capturing the method name, method arguments, and the node itself (sender).
 */
export class Event {
  /**
   * The name of the method that caused this event.
   */
  private readonly _methodName: string;

  /**
   * A key-value map of arguments passed to the method.
   * Includes a `"self"` property referencing the sender node.
   */
  private readonly _kwargs: Record<string, any>;

  /**
   * Creates a new event object.
   *
   * @param methodName - The name of the method that triggered the event.
   * @param kwargs - The arguments passed to the method, plus a `"self"` reference to the sender.
   */
  constructor(methodName: string, kwargs: Record<string, any>) {
    this._methodName = methodName;
    this._kwargs = kwargs;
  }

  /**
   * Gets the method name associated with this event.
   */
  public get methodName(): string {
    return this._methodName;
  }

  /**
   * Gets all arguments passed to the method.
   * The `"self"` key references the observable node that triggered the event.
   */
  public get kwargs(): Record<string, any> {
    return this._kwargs;
  }

  /**
   * Gets the observable node (sender) that triggered the event.
   */
  public get sender(): ObservableNode {
    return this._kwargs['self'] as ObservableNode;
  }
}
