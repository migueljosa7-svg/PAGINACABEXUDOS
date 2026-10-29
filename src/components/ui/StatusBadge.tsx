/**
 * StatusBadge
 * ===========
 * Componente visual de estado para indicadores GPS y conexion.
 *
 * Diseño:
 *   - Toast animado con icono, texto y estado
 *   - Soporte modo oscuro
 *   - Accesible (role=status, aria-live=polite)
 *   - Variants: 'active' | 'inactive' | 'warning' | 'error'
 *   - Modo "Real" - indicador visual del GPS real del dispositivo
 *
 * Uso:
 *   <StatusBadge variant="active" label="GPS Activo" />
 *   <StatusBadge variant="inactive" label="GPS Desactivado por Seguridad" />
 */

import React from 'react';
import { FaStopCircle, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

export type StatusBadgeVariant = 'active' | 'inactive' | 'warning' | 'error' | 'info';

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  label: string;
  subtitle?: string;
  showDot?: boolean;
  className?: string;
}

const variantStyles: Record<StatusBadgeVariant, { dot: string; bg: string; text: string; border: string }> = {
  active: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  inactive: {
    dot: 'bg-red-500',
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  warning: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  error: {
    dot: 'bg-red-600',
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  info: {
    dot: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  label,
  subtitle,
  showDot = true,
  className = '',
}) => {
  const styles = variantStyles[variant];

  const iconMap: Record<StatusBadgeVariant, React.ReactNode> = {
    active: <FaCheckCircle />,
    inactive: <FaStopCircle />,
    warning: <FaExclamationTriangle />,
    error: <FaExclamationTriangle />,
    info: <FaStopCircle />,
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full
        border ${styles.bg} ${styles.border}
        text-xs font-semibold ${styles.text}
        shadow-sm ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {showDot && (
        <span className={`w-2 h-2 rounded-full ${styles.dot} animate-pulse`} />
      )}
      {iconMap[variant]}
      <span>
        {label}
        {subtitle && <span className="ml-1 text-xs opacity-70">{subtitle}</span>}
      </span>
    </div>
  );
};

/**
 * StatusBadgeSkeleton
 * =====
 * Skeleton de carga para el badge de estado mientras carga la informacion.
 */
export const StatusBadgeSkeleton: React.FC = () => (
  <div
    className="
      inline-flex items-center gap-2 px-3 py-1.5 rounded-full
      bg-gray-200 dark:bg-gray-700
      animate-pulse
    "
    role="status"
    aria-label="Cargando estado"
  >
    <span className="w-2 h-2 rounded-full bg-gray-400" />
    <div className="w-20 h-3 rounded-full bg-gray-400" />
  </div>
);

export default StatusBadge;
