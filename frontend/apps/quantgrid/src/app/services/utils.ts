export function uniqueId(): string {
  return btoa(crypto.getRandomValues(new Uint8Array(16)).join('')).replaceAll(
    '=',
    ''
  );
}

export function getApiUrl() {
  const hostname = window.location.hostname;
  const isProd = window.location.protocol === 'https:';

  return isProd ? `wss://${hostname}/ws` : `ws://${hostname}:8080/ws`;
}

export function sort(list: string[], sortAsc: boolean) {
  return [...list].sort((a, b) => {
    return sortAsc ? a.localeCompare(b) : b.localeCompare(a);
  });
}
