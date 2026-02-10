import { Decorator, Field } from '@frontend/parser';

export function editFieldDecorator(
  field: Field,
  decoratorName: string,
  decoratorArgs: string,
  shouldRemove = false
): boolean {
  try {
    const decorator = field.getDecorator(decoratorName);

    if (shouldRemove) {
      field.removeDecorator(decoratorName);
    } else {
      decorator.arguments = decoratorArgs;
    }

    return true;
  } catch (e) {
    if (shouldRemove) return false;
    try {
      field.addDecorator(new Decorator(decoratorName, decoratorArgs));

      return true;
    } catch (e) {
      return false;
    }
  }
}
