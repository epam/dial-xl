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
  function getFileName(fileName: string) {
    return fileName.substring(0, fileName.lastIndexOf('.'));
  }
  const uniqueName = createUniqueName(
    getFileName(name),
    existingNames.filter(Boolean).map((name) => getFileName(name))
  );

  const extension = name.substring(name.lastIndexOf('.'));

  return `${uniqueName}${extension}`;
}

function createNextName(name: string, count: number): string {
  return `${name}${count}`;
}
