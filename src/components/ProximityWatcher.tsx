import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { useAppStore } from '../hooks/store';
import { useRelayPosition } from '../hooks/useRelayPosition';
import { useProximityAlerts, distanceMeters } from '../hooks/useProximityAlerts';
import { PRUEBA_BARRIO } from '../config/pruebaBarrio';
import '../styles/proximity.css';

/** Entra en aviso a menos de 500 m y no se rearma hasta alejarse más de 700 m. */
const ENTER_M = 500;
const EXIT_M = 700;

/**
 * Vigilante global de proximidad. Solo trabaja si el usuario lo ha activado y
 * tiene favoritos: sin eso no abre el GPS ni consulta la posición de la comparsa.
 */
export const ProximityWatcher: React.FC = () => {
  const favorites = useAppStore((s) => s.favorites);
  const enabled = useProximityAlerts((s) => s.enabled);
  const setPermission = useProximityAlerts((s) => s.setPermission);
  const active = enabled && favorites.length > 0;

  const live = useRelayPosition(PRUEBA_BARRIO.id, active);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [banner, setBanner] = useState<number | null>(null);
  const nearRef = useRef(false);

  // Ubicación del visitante (precisión baja: gasta poca batería y basta para 500 m).
  useEffect(() => {
    if (!active) {
      setMe(null);
      return;
    }
    if (!('geolocation' in navigator)) {
      setPermission('unsupported');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPermission('granted');
        setMe({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermission('denied');
      },
      { enableHighAccuracy: false, maximumAge: 20_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active, setPermission]);

  const lat = live.position?.lat;
  const lng = live.position?.lng;
  const fresh = live.connected;

  useEffect(() => {
    if (!active || !me || lat === undefined || lng === undefined || !fresh) return;
    const d = distanceMeters(me.lat, me.lng, lat, lng);
    if (!nearRef.current && d <= ENTER_M) {
      nearRef.current = true;
      setBanner(Math.round(d / 10) * 10);
      try {
        // Chrome solo permite vibrar tras un gesto del usuario.
        if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.([220, 110, 220]);
      } catch {
        // iOS no soporta vibración: el aviso visual es suficiente
      }
    } else if (nearRef.current && d > EXIT_M) {
      nearRef.current = false;
      setBanner(null);
    } else if (nearRef.current) {
      setBanner(Math.round(d / 10) * 10);
    }
  }, [active, me, lat, lng, fresh]);

  return (
    <AnimatePresence>
      {active && banner !== null && (
        <motion.div
          className="proximity-banner"
          role="alert"
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        >
          <span className="proximity-emoji" aria-hidden="true">🎉</span>
          <div className="proximity-text">
            <strong>¡La comparsa está cerca!</strong>
            <span>A unos {banner} m de ti</span>
          </div>
          <Link to="/recorridos" className="proximity-go" onClick={() => setBanner(null)}>Ver mapa</Link>
          <button type="button" className="proximity-close" onClick={() => setBanner(null)} aria-label="Cerrar aviso">
            <FaTimes aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProximityWatcher;
