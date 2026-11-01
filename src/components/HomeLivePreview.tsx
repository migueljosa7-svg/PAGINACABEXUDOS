import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { FaLocationArrow } from 'react-icons/fa';
import { resolveRoom } from '../config/liveRooms';
import { useRelayPosition } from '../hooks/useRelayPosition';

const HomeLiveMap = lazy(() => import('./maps/HomeLiveMap'));

export function HomeLivePreview() {
  const room = resolveRoom(new URLSearchParams(window.location.search).get('token'));
  const live = useRelayPosition(room.token);
  const status = live.position
    ? live.connected ? 'En directo' : 'Señal interrumpida'
    : live.connected ? 'Esperando señal GPS' : 'Conectando al servicio';

  return (
    <section className="home-live-card overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-red-800">
            <span className={`home-live-dot ${live.connected && live.position ? 'is-live' : ''}`} />
            {status}
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">La comparsa en el mapa</h2>
          <p className="mt-1 text-sm text-slate-600">{room.label} · Zaragoza</p>
        </div>
        <Link
          to={`/gps-live?token=${encodeURIComponent(room.token)}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
        >
          <FaLocationArrow aria-hidden="true" />
          Abrir mapa en directo
        </Link>
      </div>

      <div className="home-live-map-wrap relative h-[320px] bg-slate-100 sm:h-[390px]">
        {live.position ? (
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-slate-600">Cargando mapa…</div>}>
            <HomeLiveMap
              position={[live.position.lat, live.position.lng]}
              trail={live.trail}
              label={live.position.label}
              accuracy={live.position.accuracyM}
            />
          </Suspense>
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div className="max-w-sm">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-white text-xl text-red-800 shadow-sm">
                <FaLocationArrow aria-hidden="true" />
              </div>
              <p className="font-bold text-slate-800">El recorrido aparecerá aquí</p>
              <p className="mt-1 text-sm text-slate-600">Cuando el dispositivo de la comparsa inicie la emisión GPS, verás su posición y el trazado actualizado automáticamente.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs text-slate-600 sm:px-7">
        <span aria-live="polite">
          {live.position
            ? `Última actualización hace ${live.ageSeconds} s`
            : live.connected ? 'Conectado al servicio de ubicación' : 'Conectando con el servicio de ubicación'}
        </span>
        <span>Ubicación compartida con permiso del emisor</span>
      </div>
    </section>
  );
}
