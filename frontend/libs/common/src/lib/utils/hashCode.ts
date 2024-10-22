export function hashCode(str: string) {
  return str
    .split('')
    .reduce(
      (prevHash, currVal) => (prevHash << 5) - prevHash + currVal.charCodeAt(0),
      0
    );
}
