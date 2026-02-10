type HasGlobalOffsets = {
  globalOffsetStart: number;
  globalOffsetEnd: number;
};

export function hasGlobalOffsets(x: unknown): x is HasGlobalOffsets {
  if (typeof x !== 'object' || x === null) return false;

  const start = (x as any).globalOffsetStart;
  const end = (x as any).globalOffsetEnd;

  return typeof start === 'number' && typeof end === 'number';
}
