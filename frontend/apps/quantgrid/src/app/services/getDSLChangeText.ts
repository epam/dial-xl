export const getDSLChangeText = (
  oldDSL: string,
  newDSL: string,
  limit = 5
): string => {
  const initialText = 'DSL change';
  const lines = newDSL.split('\n');
  const oldLines = oldDSL.split('\n');

  const changedLines: number[] = lines.reduce((acc: number[], line, index) => {
    if (line !== oldLines[index]) {
      acc.push(index + 1);
    }

    return acc;
  }, []);

  if (changedLines.length === 0) return initialText;

  const limitedChangedLines = changedLines.slice(0, limit);
  const ellipsis =
    limitedChangedLines.length !== changedLines.length ? '...' : '';

  const text =
    changedLines.length > 1
      ? `lines ${limitedChangedLines.join(', ')}${ellipsis}`
      : `line ${changedLines[0]}`;

  return `${initialText} (${text})`;
};
