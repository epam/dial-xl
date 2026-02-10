import { Event } from './Event';
import { ObservableNode } from './Observer';

/**
 * A decorator that augments either a method or a setter accessor with
 * observer notifications. Before and after the original method/setter call,
 * the decorator triggers `_notify_before` and `_notify_after` on the node's observer.
 *
 * @example
 * ```ts
 * class MyClass extends ObservableNode {
 *   private _name = '';
 *
 *   // Decorating a setter:
 *   @notifyObserver()
 *   set name(value: string) {
 *     this._name = value;
 *   }
 *
 *   // Decorating a method:
 *   @notifyObserver()
 *   public rename(newName: string): void {
 *     this._name = newName;
 *   }
 * }
 * ```
 *
 * @returns A decorator function that wraps the original method or setter accessor.
 */
export function notifyObserver() {
  /**
   * The actual decorator that modifies the property descriptor for either
   * a method or a setter.
   *
   * @param target - The prototype of the class or the constructor function.
   * @param propertyKey - The name of the method or accessor being decorated.
   * @param descriptor - The property descriptor for the method or accessor.
   * @returns The modified property descriptor.
   */
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalSet = descriptor.set;
    if (typeof originalSet === 'function') {
      descriptor.set = function (...args: any): any {
        const self = this as ObservableNode;
        let event: Event | undefined;

        if (self.observer) {
          const kwargs = { self, args };
          event = new Event(propertyKey, kwargs);
          self.observer.notifyBefore(event);
        }

        // Call the original setter function.
        const result = originalSet.apply(this, args);

        if (self.observer && event) {
          self.observer.notifyAfter(event);
        }

        return result;
      };
    } else {
      const originalMethod = descriptor.value;
      descriptor.value = function (...args: any[]): any {
        const self = this as ObservableNode;
        let event: Event | undefined;

        if (self.observer) {
          const kwargs = { self, args };
          event = new Event(propertyKey, kwargs);
          self.observer.notifyBefore(event);
        }

        // Call the original method.
        const result = originalMethod.apply(this, args);

        if (self.observer && event) {
          self.observer.notifyAfter(event);
        }

        return result;
      };
    }

    return descriptor;
  };
}
