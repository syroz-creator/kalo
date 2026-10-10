import { isNativeApp } from './native';

const storageKey = 'kalo-api-server';
export const defaultServer = 'https://kalo-klfs.onrender.com';

export function normalizeServerUrl(value: string) {
  let url: URL;
  try { url = new URL(value.trim()); }
  catch { throw new Error('Enter a full HTTPS server address.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Use an HTTPS address without a path, password, or query.');
  }
  return url.origin;
}

export function getServerUrl() {
  try { return normalizeServerUrl(localStorage.getItem(storageKey) || defaultServer); }
  catch { return defaultServer; }
}

export function saveServerUrl(value: string) {
  const url = normalizeServerUrl(value);
  localStorage.setItem(storageKey, url);
  return url;
}

export function apiUrl(path: string) {
  return isNativeApp() ? `${getServerUrl()}${path}` : path;
}

export async function checkServer(value: string) {
  const url = normalizeServerUrl(value);
  const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The photo API is not running here. Deploy a Node Web Service, not a Static Site.');
  }
  const body = await response.json();
  if (body.status !== 'ok') throw new Error('This address is not a Kalo meal server.');
  if (body.hasGeminiKey !== true) throw new Error('The server is running but needs GEMINI_API_KEY in its environment.');
}
