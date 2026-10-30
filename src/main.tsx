import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { runSingleSourceValidationGuard } from './data/singleSourceValidationGuard'

// Valida consistencia de datos en runtime durante build/desarrollo.
if (import.meta.env.MODE !== 'test') {
  runSingleSourceValidationGuard()
}

// ── PWA: captura del banner de instalación ──────────────────────────────────
// Se almacena el evento en window para que la UI lo use cuando quiera mostrar
// el botón "Instalar app". Sin esto, el navegador muestra un warning en consola
// ("beforeinstallprompt was preventDefault'd") y puede perderse el evento.
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

window.addEventListener('beforeinstallprompt', (e) => {
  // Previene el mini-infobar automático de Chrome (Android)
  e.preventDefault();
  deferredInstallPrompt = e as BeforeInstallPromptEvent;
  // Dispara un evento personalizado para que cualquier componente pueda saber
  // que la PWA es instalable ahora mismo.
  window.dispatchEvent(new CustomEvent('pwa-installable', { detail: deferredInstallPrompt }));
});

// Acceso global tipado para componentes
(window as unknown as Record<string, unknown>).__pwaInstallPrompt = () => deferredInstallPrompt;

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerSW({
      immediate: false,
      onNeedRefresh() {},
      onOfflineReady() {},
    })
  })
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('No se encontró el contenedor #root');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
