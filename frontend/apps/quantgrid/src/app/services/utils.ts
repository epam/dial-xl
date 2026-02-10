export function uniqueId(): string {
  return btoa(crypto.getRandomValues(new Uint8Array(16)).join('')).replaceAll(
    '=',
    ''
  );
}

export function getApiUrl() {
  const { protocol, hostname } = window.location;

  const apiBaseUrl = window.externalEnv.apiBaseUrl;

  if (apiBaseUrl) return apiBaseUrl;

  return `${protocol}//${hostname}`;
}
