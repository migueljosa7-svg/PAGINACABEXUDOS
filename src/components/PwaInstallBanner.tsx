/**
 * PwaInstallBanner
 * ================
 * Banner flotante no intrusivo para instalar la PWA.
 * Aparece solo cuando el navegador emite `beforeinstallprompt`
 * (Chrome Android, Edge, etc.). Se oculta automáticamente al
 * instalar o al descartarlo (y no vuelve a aparecer en 7 días).
 */
import React, { useEffect, useState } from 'react';

const DISMISSED_KEY = 'pwa_banner_dismissed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function wasDismissedRecently(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISSED_KEY) ?? '0');
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export const PwaInstallBanner: React.FC = () => {
  const [prompt, setPrompt] = useState<null | { prompt(): Promise<void> }>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (wasDismissedRecently()) return;

    // El prompt puede haberse capturado antes de que este componente montara
    const existing = (window as unknown as Record<string, unknown>).__pwaInstallPrompt?.() as { prompt(): Promise<void> } | null;
    if (existing) {
      setPrompt(existing);
      setVisible(true);
    }

    const handler = (e: Event) => {
      const p = (e as CustomEvent).detail as { prompt(): Promise<void> };
      setPrompt(p);
      setVisible(true);
    };
    window.addEventListener('pwa-installable', handler);
    return () => window.removeEventListener('pwa-installable', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    setVisible(false);
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible || !prompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar aplicación"
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#1a1a2e',
        border: '1px solid #D1121F',
        borderRadius: 16,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        maxWidth: 340,
        width: 'calc(100% - 32px)',
        animation: 'slideUp 0.3s ease',
      }}
    >
      <span style={{ fontSize: '1.4rem' }}>📲</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f0c040' }}>
          Instalar GigantesZGZ
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
          Acceso rápido desde tu pantalla de inicio
        </div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          background: '#D1121F',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '6px 14px',
          fontWeight: 700,
          fontSize: '0.8rem',
          cursor: 'pointer',
        }}
      >
        Instalar
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Cerrar"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#64748b',
          fontSize: '1.2rem',
          cursor: 'pointer',
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
};

export default PwaInstallBanner;
