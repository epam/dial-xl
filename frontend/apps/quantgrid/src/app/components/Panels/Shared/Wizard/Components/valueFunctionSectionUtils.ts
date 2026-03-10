export const vfRowPrefix = 'vf-row:';
export const vfSlotPrefix = 'vf-slot:';

export function makeValueFnRowId(valueFnId: string) {
  return `${vfRowPrefix}${valueFnId}`;
}

export function makeValueFnSlotId(valueFnId: string, argIndex: number) {
  return `${vfSlotPrefix}${valueFnId}:${argIndex}`;
}

export function parseValueFnSlotId(id: string): {
  valueFnId: string;
  argIndex: number;
} | null {
  if (!id.startsWith(vfSlotPrefix)) return null;

  const rest = id.slice(vfSlotPrefix.length);

  const lastColon = rest.lastIndexOf(':');
  if (lastColon === -1) return null;

  const valueFnId = rest.slice(0, lastColon);
  const argIndexStr = rest.slice(lastColon + 1);

  const argIndex = Number(argIndexStr);
  if (!valueFnId || Number.isNaN(argIndex)) return null;

  return { valueFnId, argIndex };
}

export function parseValueFnRowId(id: string): { valueFnId: string } | null {
  if (!id.startsWith(vfRowPrefix)) return null;
  const valueFnId = id.slice(vfRowPrefix.length);
  if (!valueFnId) return null;

  return { valueFnId };
}
