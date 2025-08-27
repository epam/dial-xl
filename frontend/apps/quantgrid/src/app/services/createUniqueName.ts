export function createUniqueName(
  name?: string,
  existingNames?: string[]
): string {
  if (!name) return '';
  if (!existingNames) return name;

  const regex = /(.*?)(\d+)?$/;
  const trimmedName = name.trim();
  const matches = trimmedName.match(regex);
  const targetName = matches ? matches[1] : trimmedName;

  existingNames = existingNames.filter(Boolean).map((name) => name);

  if (existingNames.includes(trimmedName)) {
    let newIndex = 1;
    let found = false;

    while (!found) {
      if (existingNames.includes(createNextName(targetName, newIndex))) {
        newIndex++;
      } else {
        found = true;
      }
    }

    return createNextName(targetName, newIndex);
  }

  return trimmedName;
}

export function createUniqueFileName(
  name: string,
  existingNames: string[]
): string {
  if (!name) return '';
  if (!existingNames?.length) return name;

  function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex === -1 ? name : name.slice(0, dotIndex);
  const extension = dotIndex === -1 ? '' : name.slice(dotIndex);

  const matches = base.match(/^(.*?)(?:\s\((\d+)\))?$/)!;
  const root = matches[1];
  const version = matches[2] ? +matches[2] : 0;

  const pattern = new RegExp(`^${escapeRegExp(root)}(?: \\((\\d+)\\))?$`);
  let maxVersion = version;

  for (const existing of existingNames) {
    const dotIndex = existing.lastIndexOf('.');
    const exBase = dotIndex === -1 ? existing : existing.slice(0, dotIndex);

    const matches = exBase.match(pattern);
    if (matches) {
      const n = matches[1] ? +matches[1] : 0;
      if (n >= maxVersion) maxVersion = n + 1;
    }
  }

  if (maxVersion === version && !existingNames.includes(name)) return name;

  return `${root} (${maxVersion})${extension}`;
}

function createNextName(name: string, count: number): string {
  return `${name}${count}`;
}
