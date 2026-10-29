import React from 'react';

export interface LoadingOverlayProps {
  message?: string;
  progress?: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Conectando...',
  progress = 0,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    role="dialog"
    aria-live="polite"
  >
    <div className="text-center text-white">
      <div className="inline-flex items-center gap-3">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        <div className="text-sm font-medium">{message}</div>
      </div>
      {progress > 0 && progress < 1 && (
        <div className="mt-3 w-48">
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-150"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-white/80">
            {Math.round(progress * 100)}%
          </div>
        </div>
      )}
    </div>
  </div>
);

export default LoadingOverlay;
