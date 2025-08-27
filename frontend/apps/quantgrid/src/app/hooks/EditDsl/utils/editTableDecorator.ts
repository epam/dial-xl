import { Decorator, lineBreak, Table } from '@frontend/parser';

export function editTableDecorator(
  table: Table,
  decoratorName: string,
  decoratorArgs: string,
  shouldRemove = false
): boolean {
  try {
    const decorator = table.getDecorator(decoratorName);

    if (shouldRemove) {
      table.removeDecorator(decoratorName);
    } else {
      decorator.arguments = decoratorArgs + lineBreak;
    }

    return true;
  } catch (e) {
    try {
      if (!shouldRemove) {
        table.addDecorator(new Decorator(decoratorName, decoratorArgs));
      }

      return true;
    } catch (e) {
      return false;
    }
  }
}
