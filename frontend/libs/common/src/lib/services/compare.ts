export function normalizeForCompare(option: any): any {
  if (Array.isArray(option)) {
    return option.map(normalizeForCompare);
  }
  if (option && typeof option === 'object') {
    const result: any = {};
    for (const key of Object.keys(option)) {
      const value = option[key];

      if (typeof value === 'function') continue;

      result[key] = normalizeForCompare(value);
    }

    return result;
  }

  return option;
}
