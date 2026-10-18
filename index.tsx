
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event.reason?.message || event.reason || '');
    if (reason.includes('WebSocket closed without opened') || reason.includes('failed to connect to websocket')) {
      event.preventDefault();
    }
  });
}

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
} else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
