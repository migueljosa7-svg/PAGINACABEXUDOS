import React from 'react';
import { useAppStore } from '../hooks/store';
import { useProximityAlerts } from '../hooks/useProximityAlerts';

/** Interruptor "Avisarme cuando la comparsa esté a menos de 500 m" (Favoritos). */
export const ProximityToggle: React.FC = () => {
  const hasFavorites = useAppStore((s) => s.favorites.length > 0);
  const { enabled, permission, setEnabled, setPermission } = useProximityAlerts();

  const toggle = (value: boolean) => {
    setEnabled(value);
    if (value && 'geolocation' in navigator) {
      // Dispara el permiso al activar, no al azar más tarde.
      navigator.geolocation.getCurrentPosition(
        () => setPermission('granted'),
        (e) => e.code === e.PERMISSION_DENIED && setPermission('denied'),
        { maximumAge: 60_000, timeout: 15_000 },
      );
    }
  };

  return (
    <section className="proximity-toggle" aria-labelledby="proximity-title">
      <label className="proximity-switch">
        <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} />
        <span className="proximity-track" aria-hidden="true"><span className="proximity-thumb" /></span>
        <span>
          <strong id="proximity-title">🔔 Avísame cuando la comparsa esté cerca</strong>
          <small>Te avisaremos (con vibración) cuando esté a menos de 500 m de ti. Tu ubicación no sale de tu móvil.</small>
        </span>
      </label>
      {enabled && !hasFavorites && (
        <p className="proximity-note">Marca algún personaje con el corazón ♥ para recibir avisos.</p>
      )}
      {enabled && permission === 'denied' && (
        <p className="proximity-note is-warn">Has bloqueado la ubicación. Actívala en los ajustes del navegador para recibir avisos.</p>
      )}
    </section>
  );
};

export default ProximityToggle;
