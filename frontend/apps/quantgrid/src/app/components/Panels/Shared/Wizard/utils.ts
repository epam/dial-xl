import { FieldItem } from './constants';

export const formatFieldReference = (
  fields: FieldItem[],
  tableName: string,
) => {
  if (!tableName) return '';

  if (fields.length === 0) {
    return '';
  } else if (fields.length === 1) {
    return `${tableName}[${fields[0].name}]`;
  } else {
    // For multiple fields, use the [[field1],[field2]] syntax
    const fieldRefs = fields.map((field) => `[${field.name}]`).join(',');

    return `${tableName}[${fieldRefs}]`;
  }
};

export const toSelectOption = (
  value: string,
  label?: string,
): { value: string; label: string } => ({
  value,
  label: label || value,
});

export const normalizeFormula = (s: string) => s.trim().replaceAll(/\s/g, '');

export function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;

  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }

  return null;
}
