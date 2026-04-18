/**
 * CSRF-aware fetch wrapper for client-side code.
 *
 * Reads the op_csrf cookie and sends it as X-CSRF-Token header
 * on every POST, PUT, PATCH, and DELETE request.
 */

function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)op_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (isStateChanging) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      const headers = new Headers(options.headers);
      headers.set('X-CSRF-Token', csrfToken);
      options.headers = headers;
    }
  }

  return fetch(url, options);
}
