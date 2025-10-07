function hashString(str: string): number {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }

  return hash;
}

export function stableColorFromLabel(label: string): string {
  const hash = Math.abs(hashString(label));

  // Use a prime multiplier to better distribute hues
  const hue = (hash * 13) % 360;

  // Derive saturation from a different part of hash, ensuring a reasonable range
  const saturation = 50 + ((hash >> 2) % 40); // Results in 50% to 89%

  // Derive lightness from yet another part of the hash for variation
  const lightness = 40 + ((hash >> 4) % 20); // Results in 40% to 59%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
