const DEFAULT_WORKER_API_URL = 'https://haven-space-api.floresaybaez574.workers.dev';
const LOCAL_WORKER_API_URL = 'http://localhost:8000';
const STORAGE_KEY = 'havenSpaceApiBaseUrl';

/** Trailing-slash-free http(s) URL, or null when the value is unusable. */
function normalize(value: string): string | null {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  try {
    const { protocol } = new URL(trimmed);
    return protocol === 'http:' || protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_WORKER_API_URL;

  const override = new URLSearchParams(window.location.search).get('apiBaseUrl');
  if (override !== null) {
    const cleared = override.trim().toLowerCase();
    // `?apiBaseUrl=clear` (or `reset`) drops the saved override.
    if (cleared === '' || cleared === 'clear' || cleared === 'reset') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const next = normalize(override);
      if (next) {
        localStorage.setItem(STORAGE_KEY, next);
        return next;
      }
    }
  }

  const stored = normalize(localStorage.getItem(STORAGE_KEY) ?? '');
  if (stored) return stored;
  localStorage.removeItem(STORAGE_KEY);

  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1'
    ? LOCAL_WORKER_API_URL
    : DEFAULT_WORKER_API_URL;
}
