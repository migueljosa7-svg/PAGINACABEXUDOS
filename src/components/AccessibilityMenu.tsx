import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaUniversalAccess } from 'react-icons/fa';

/**
 * Ajustes de lectura para todo tipo de público (mayores, baja visión, niños):
 * tamaño de letra, alto contraste y reducción de movimiento. Se guardan en el
 * dispositivo y se aplican con atributos en <html> (ver styles/a11y.css).
 */
type TextSize = 'normal' | 'large' | 'xlarge';
interface Prefs { size: TextSize; contrast: boolean; calm: boolean }

const KEY = 'pcx_a11y';
const DEFAULTS: Prefs = { size: 'normal', contrast: false, calm: false };

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function apply(p: Prefs) {
  const root = document.documentElement;
  root.dataset.textSize = p.size;
  root.dataset.contrast = p.contrast ? 'high' : 'normal';
  root.dataset.calm = p.calm ? 'on' : 'off';
}

/** Aplica las preferencias guardadas antes del primer render del menú. */
export function initAccessibilityPrefs() {
  apply(load());
}

export const AccessibilityMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(load);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apply(prefs);
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* modo privado */ }
  }, [prefs]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const sizes: { id: TextSize; label: string; sample: string }[] = [
    { id: 'normal', label: 'Normal', sample: 'A' },
    { id: 'large', label: 'Grande', sample: 'A' },
    { id: 'xlarge', label: 'Muy grande', sample: 'A' },
  ];

  return (
    <div className="a11y-menu" ref={rootRef}>
      <button
        type="button"
        className="action-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Ajustes de lectura y accesibilidad"
        title="Letra y contraste"
      >
        <FaUniversalAccess aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="a11y-popover"
            role="dialog"
            aria-label="Ajustes de lectura"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <p className="a11y-title">Tamaño de la letra</p>
            <div className="a11y-sizes" role="radiogroup" aria-label="Tamaño de la letra">
              {sizes.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.size === s.id}
                  className={prefs.size === s.id ? 'is-active' : ''}
                  onClick={() => setPrefs((p) => ({ ...p, size: s.id }))}
                >
                  <span style={{ fontSize: `${1 + i * 0.35}rem`, fontWeight: 800 }}>{s.sample}</span>
                  <small>{s.label}</small>
                </button>
              ))}
            </div>
            <label className="a11y-switch">
              <input type="checkbox" checked={prefs.contrast} onChange={(e) => setPrefs((p) => ({ ...p, contrast: e.target.checked }))} />
              <span>Alto contraste</span>
            </label>
            <label className="a11y-switch">
              <input type="checkbox" checked={prefs.calm} onChange={(e) => setPrefs((p) => ({ ...p, calm: e.target.checked }))} />
              <span>Menos animaciones</span>
            </label>
            <button type="button" className="a11y-reset" onClick={() => setPrefs(DEFAULTS)}>Restablecer</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccessibilityMenu;
