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

  existingNames = existingNames.map((name) => name.toLowerCase());

  if (existingNames.includes(trimmedName.toLowerCase())) {
    let newIndex = 1;
    let found = false;

    while (!found) {
      if (
        existingNames.includes(
          createNextName(targetName.toLowerCase(), newIndex)
        )
      ) {
        newIndex++;
      } else {
        found = true;
      }
    }

    return createNextName(targetName, newIndex);
  }

  return trimmedName;
}

function createNextName(name: string, count: number): string {
  return `${name}${count}`;
}
