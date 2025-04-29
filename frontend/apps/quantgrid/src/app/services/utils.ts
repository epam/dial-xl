export function uniqueId(): string {
  return btoa(crypto.getRandomValues(new Uint8Array(16)).join('')).replaceAll(
    '=',
    ''
  );
}

export function getApiUrl() {
  const hostname = window.location.hostname;
  const isProd = window.location.protocol === 'https:';

  return isProd ? `https://${hostname}` : `http://${hostname}:8080`;
}
