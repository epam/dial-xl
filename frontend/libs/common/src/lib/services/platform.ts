export enum OS {
  Windows = 'windows',
  Mac = 'mac',
  UnSupported = 'unsupported',
}

export function getOS() {
  const agent = typeof window !== 'undefined' ? navigator.userAgent : '';
  if (agent.includes('Windows')) return OS.Windows;
  if (agent.includes('Macintosh')) return OS.Mac;

  return OS.UnSupported;
}
