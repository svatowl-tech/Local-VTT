/**
 * Central helper to handle Express backend API routing and asset streaming
 * when running inside Tauri desktop shell (which uses tauri.localhost custom protocol)
 * versus a standard web environment.
 */

export function checkIsTauri(): boolean {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return (
      origin.startsWith('tauri:') ||
      origin.includes('tauri.localhost') ||
      // @ts-ignore
      !!(window.__TAURI_INTERNALS__ || window.__TAURI__)
    );
  }
  return false;
}

export function getApiBaseUrl(): string {
  if (checkIsTauri()) {
    // Prepend the local Express backend server address
    return 'http://localhost:3000';
  }
  return '';
}

export function resolveApiUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/api/')) {
    return `${getApiBaseUrl()}${url}`;
  }
  return url;
}
