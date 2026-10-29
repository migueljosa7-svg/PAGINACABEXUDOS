/**
 * ToastNotification System
 * =========================
 * Sistema simple de notificaciones toast integrado sin dependencias externas.
 *
 * Uso:
 *   const { toast } = useToast();
 *   toast.success('GPS REAL activado', { duration: 3000 });
 *   toast.error('Permiso de geolocalización denegado', { persistent: true });
 *
 * Características:
 *   - Posicionamiento fixed (top-right)
 *   - Auto-dismiss configurable
 *   - Tipos: success, error, warning, info
 *   - Animaciones de entrada/salida
 *   - Accesible (aria-live=assertive)
 */

import React, { createContext, useCallback, useContext, useState, useRef, useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  duration?: number;
  persistent?: boolean;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  persistent: boolean;
}

const ToastContext = createContext<{
  toast: {
    success: (msg: string, opts?: ToastOptions) => void;
    error: (msg: string, opts?: ToastOptions) => void;
    warning: (msg: string, opts?: ToastOptions) => void;
    info: (msg: string, opts?: ToastOptions) => void;
  };
} | null>(null);

const toastStyles: Record<ToastType, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  success: {
    icon: <FaCheckCircle className="text-emerald-500" />,
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-200',
  },
  error: {
    icon: <FaExclamationTriangle className="text-red-500" />,
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
  },
  warning: {
    icon: <FaExclamationTriangle className="text-amber-500" />,
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
  },
  info: {
    icon: <FaInfoCircle className="text-blue-500" />,
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, options: ToastOptions = {}) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 8);
      const toast: Toast = {
        id,
        type,
        message,
        persistent: options.persistent ?? false,
      };
      setToasts((prev) => [...prev, toast]);

      if (!toast.persistent) {
        const duration = options.duration ?? 4000;
        setTimeout(() => dismissToast(id), duration);
      }
    },
    [dismissToast]
  );

  const showToast = {
    success: (msg: string, opts?: ToastOptions) => addToast('success', msg, opts),
    error: (msg: string, opts?: ToastOptions) => addToast('error', msg, opts),
    warning: (msg: string, opts?: ToastOptions) => addToast('warning', msg, opts),
    info: (msg: string, opts?: ToastOptions) => addToast('info', msg, opts),
  };

  return (
    <ToastContext.Provider value={{ toast: showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{
  toasts: Toast[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 w-80 max-w-sm"
      aria-live="assertive"
      aria-label="Notificaciones"
    >
      {toasts.map((toast) => {
        const style = toastStyles[toast.type];
        return (
          <div
            key={toast.id}
            className={`
              flex items-start gap-3 p-3 rounded-lg shadow-lg border
              ${style.bg} ${style.border} ${style.text}
              animate-in slide-in-from-top-2 duration-300
              text-sm
            `}
          >
            {style.icon}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Cerrar notificación"
            >
              <FaTimes className="text-xs" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

export default useToast;
