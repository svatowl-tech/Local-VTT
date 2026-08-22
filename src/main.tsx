import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { resolveApiUrl, checkIsTauri } from './utils/apiUrlHelper.ts';
import './index.css';

// Prevent uncaught errors from unhandled asynchronous promises
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled rejection handled safely:', event.reason);
    event.preventDefault();
  });

  // Global window.fetch wrapper to automatically route relative API endpoints to local Express server
  const originalFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      value: function (input: any, init: any) {
        let urlStr = '';
        if (typeof input === 'string') {
          urlStr = input;
        } else if (input instanceof URL) {
          urlStr = input.href;
        } else if (input && typeof input === 'object' && 'url' in input) {
          urlStr = (input as any).url;
        }

        if (checkIsTauri() && urlStr && urlStr.includes('/api/')) {
          // Fast-fail Express endpoints in Tauri to avoid ERR_CONNECTION_REFUSED network spam.
          // Tauri uses native Rust fallback paths instead.
          return Promise.reject(new Error('Express API is not available in Tauri environment.'));
        }

        if (typeof input === 'string') {
          return originalFetch(resolveApiUrl(input), init);
        } else if (input instanceof URL) {
          return originalFetch(new URL(resolveApiUrl(input.href)), init);
        } else if (input && typeof input === 'object' && 'url' in input) {
          const targetUrl = resolveApiUrl((input as any).url);
          const requestCopy = new Request(targetUrl, input as RequestInit);
          return originalFetch(requestCopy, init);
        }
        return originalFetch(input, init);
      },
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (err) {
    console.warn('Failed to define safe global fetch:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
