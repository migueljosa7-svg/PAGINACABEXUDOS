/**
 * GESTOR DE PARADAS (B2G) — edición con un clic, sin tocar código.
 *
 * El objetivo es que un técnico de la Concejería pueda cambiar una parada,
 * añadir otra o asignarle un comercio sin pedirle a nadie un despliegue. Todo lo
 * que hace aquí acaba en `POST /api/municipal/paradas` y se refleja en el mapa
 * público de /recorridos en la siguiente carga.
 *
 * ── Por qué los datos NO se editan arrastrando un pin ───────────────────────
 * Editar sobre Leaflet exige decidir CRS, ajustar al trazado y deshacer, y en
 * un portátil municipal eso se traduce en "la he movido 30 m y no me entero".
 * Aquí se edita en lista, con coordenadas explícitas. Menos elegante,
 * infinitamente más fiable.
 *
 * ── Salvamento optimista con reversión ──────────────────────────────────────
 * Al guardar se actualiza la lista al instante y, si el servidor rechaza el
 * cambio, se vuelve a lo que había. Un panel que se queda mirando al servidor
 * entre clic y clic se lee como lento; uno que miente sobre lo guardado es peor.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  FaMapMarkerAlt,
  FaPlus,
  FaTrash,
  FaSave,
  FaSyncAlt,
  FaExclamationTriangle,
  FaStore,
  FaUndo,
} from 'react-icons/fa';
import { barrios } from '../data/singleSource';
import { PATROCINADORES } from '../data/patrocinadores';
import { editarParadas, type ParadaGestion } from '../services/paradas';
import { PanelError } from '../services/municipalPanel';
import '../styles/gestorParadas.css';

/**
 * Recorridos que el técnico puede gestionar.
 *
 * Se limita a los que tienen geometría real (`waypoints.length >= 2`): una
 * parada sobre un recorrido pendiente no se puede situar en ningún mapa, y
 * ofrecerlo sería una pantalla vacía con botones que no hacen nada.
 */
const RUTAS_GESTIONABLES = barrios
  .map((b) => b.recorrido)
  .filter((r) => r.waypoints.length >= 2)
  .map((r) => ({ id: r.id, nombre: r.nombre, barrioId: r.barrioId }));

/** Prefijo de los ids que genera el botón "añadir": legible y sin colisiones. */
function idNueva(paradaCount: number): string {
  return `parada-${Date.now().toString(36)}-${paradaCount}`;
}

/**
 * Lee las paradas PUBLICADAS de un recorrido.
 *
 * Se leen del MISMO endpoint público (`/api/paradas`) que usa el mapa, no de
 * uno privado: así el técnico ve exactamente lo que está publicado, y no una
 * versión que se parece pero no es la misma.
 *
 * Lanza si la respuesta no es utilizable, a propósito: quien la llama decide si
 * eso es un errorShown o un "no hay nada guardado" (que no lo es). */
async function leerParadasPublicadas(rutaId: string): Promise<ParadaGestion[]> {
  const res = await fetch('/api/paradas', { cache: 'no-store' });
  const tipo = (res.headers.get('content-type') || '').toLowerCase();
  // Una ruta de API que contesta HTML (proxy delante, service worker viejo)
  // revienta `json()` con `Unexpected token '<'`.
  if (!res.ok || tipo.includes('text/html')) throw new Error('respuesta no válida');
  const data = (await res.json()) as { paradas?: Record<string, ParadaGestion[]> };
  return data.paradas?.[rutaId] ?? [];
}

export const GestorParadas: React.FC<{ token: string }> = ({ token }) => {
  const [rutaId, setRutaId] = useState<string>(RUTAS_GESTIONABLES[0]?.id ?? '');
  const [paradas, setParadas] = useState<ParadaGestion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  /** Copia de lo último que venía del servidor, para el botón "descartar". */
  const [antesDeEditar, setAntesDeEditar] = useState<ParadaGestion[] | null>(null);

  /**
   * Carga manual (botón "Recargar").
   *
   * La carga INICIAL la hace el `useEffect` de abajo, no esta función: un
   * efecto que llama a una función que hace `setCargando(true)` de forma
   * síncrona provoca un render en cascada. Aquí sí tiene sentido, porque nace de
   * un clic.
   */
  const recargar = useCallback(async () => {
    setCargando(true);
    setMensaje(null);
    try {
      setParadas(await leerParadasPublicadas(rutaId));
      setAntesDeEditar(null);
    } catch {
      setMensaje({
        tipo: 'error',
        texto: 'No se pudieron cargar las paradas publicadas. Revisa la conexión con el servidor.',
      });
    } finally {
      setCargando(false);
    }
  }, [rutaId]);

  // Carga inicial y al cambiar de recorrido. Todos los `setState` viven dentro
  // de las callbacks de la promesa, nunca en el cuerpo del efecto.
  useEffect(() => {
    let vivo = true;
    leerParadasPublicadas(rutaId)
      .then((lista) => {
        if (!vivo) return;
        setParadas(lista);
        setAntesDeEditar(null);
      })
      .catch(() => {
        if (!vivo) return;
        setMensaje({
          tipo: 'error',
          texto: 'No se pudieron cargar las paradas publicadas. Revisa la conexión con el servidor.',
        });
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [rutaId]);


  // ---- Mutaciones locales (optimistas) --------------------------------------
  // Todas se guardan en estado y se envían juntas: mover dos paradas son dos
  // peticiones que se pisan entre sí, y `replace` es atómico en el servidor.
  const editar = useCallback((id: string, cambios: Partial<ParadaGestion>) => {
    setAntesDeEditar((prev) => prev ?? null);
    setParadas((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
  }, []);

  const eliminar = useCallback((id: string) => {
    setParadas((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const anadir = useCallback(() => {
    const nueva: ParadaGestion = {
      id: idNueva(paradas.length),
      nombre: `Parada ${paradas.length + 1}`,
      // Se sitúa en el centro de Zaragoza: es un borrador visible que el técnico
      // corrige con las coordenadas, no una parada inventada en otro sitio.
      lat: 41.6488,
      lng: -0.8891,
      comercioId: '',
      activa: true,
    };
    setParadas((prev) => [...prev, nueva]);
    setMensaje(null);
  }, [paradas.length]);

  const guardar = useCallback(async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const guardadas = await editarParadas(token, { rutaId, tipo: 'replace', paradas });
      setParadas(guardadas);
      setAntesDeEditar(null);
      setMensaje({
        tipo: 'ok',
        texto: `Guardado. ${guardadas.length} parada(s) publicadas ya están en el mapa público.`,
      });
    } catch (err) {
      // Reversión: si el servidor no lo ha guardado, no puede quedarse pintado
      // como si lo estuviera.
      if (antesDeEditar) setParadas(antesDeEditar);
      const texto = err instanceof PanelError ? err.message : 'No se pudo guardar el cambio.';
      setMensaje({ tipo: 'error', texto });
    } finally {
      setGuardando(false);
    }
  }, [token, rutaId, paradas, antesDeEditar]);

  if (RUTAS_GESTIONABLES.length === 0) {
    return (
      <p className="gestor-vacio">
        No hay recorridos con geometría definida que se puedan gestionar todavía.
      </p>
    );
  }


  return (
    <section className="gestor-paradas" aria-label="Gestor de paradas del recorrido">
      <div className="gestor-head">
        <div className="gestor-head-titulo">
          <FaMapMarkerAlt aria-hidden="true" /> Gestor de paradas
        </div>
        <p className="gestor-head-sub">
          Mueve una parada, añádela o asígnale un comercio. Se publica al instante en{' '}
          <strong>/recorridos</strong> sin redesplegar.
        </p>
      </div>

      <div className="gestor-controles">
        <label className="gestor-campo">
          <span>Recorrido</span>
          <select
            className="gestor-select"
            value={rutaId}
            onChange={(e) => setRutaId(e.target.value)}
          >
            {RUTAS_GESTIONABLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="gestor-acciones">
          <button type="button" className="gestor-btn" onClick={anadir} disabled={guardando}>
            <FaPlus aria-hidden="true" /> Añadir parada
          </button>
          <button
            type="button"
            className="gestor-btn"
            onClick={() => void recargar()}
            disabled={cargando || guardando}
          >
            <FaSyncAlt aria-hidden="true" /> Recargar
          </button>
          <button
            type="button"
            className="gestor-btn"
            onClick={() => antesDeEditar && setParadas(antesDeEditar)}
            disabled={!antesDeEditar || guardando}
          >
            <FaUndo aria-hidden="true" /> Descartar
          </button>
          <button
            type="button"
            className="gestor-btn gestor-btn-primario"
            onClick={() => void guardar()}
            disabled={guardando || !paradas.length}
          >
            <FaSave aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar y publicar'}
          </button>
        </div>
      </div>

      {mensaje && (
        <p
          className={`gestor-mensaje ${mensaje.tipo === 'ok' ? 'is-ok' : 'is-error'}`}
          role={mensaje.tipo === 'error' ? 'alert' : 'status'}
        >
          {mensaje.tipo === 'error' && <FaExclamationTriangle aria-hidden="true" />}
          {mensaje.texto}
        </p>
      )}

      {cargando && <p className="gestor-cargando">Cargando paradas publicadas…</p>}

      {!cargando && paradas.length === 0 && (
        <p className="gestor-vacio">
          Este recorrido no tiene paradas editadas. Las que trae la app por defecto se
          muestran igualmente en el mapa; usa <strong>Añadir parada</strong> para crear la
          primera del recorrido.
        </p>
      )}

      <ul className="gestor-lista">
        {paradas.map((p) => (
          <li key={p.id} className="gestor-fila">
            <div className="gestor-fila-principal">
              <input
                className="gestor-input gestor-input-nombre"
                value={p.nombre}
                onChange={(e) => editar(p.id, { nombre: e.target.value })}
                placeholder="Nombre de la parada"
                aria-label={`Nombre de la parada ${p.id}`}
                maxLength={80}
              />
              <button
                type="button"
                className="gestor-btn gestor-btn-peligro"
                onClick={() => eliminar(p.id)}
                disabled={guardando}
                aria-label={`Eliminar ${p.nombre}`}
              >
                <FaTrash aria-hidden="true" />
              </button>
            </div>

            <div className="gestor-fila-coords">
              <label className="gestor-campo">
                <span>Latitud</span>
                <input
                  className="gestor-input"
                  type="number"
                  step="0.000001"
                  value={p.lat}
                  onChange={(e) => editar(p.id, { lat: Number(e.target.value) })}
                />
              </label>
              <label className="gestor-campo">
                <span>Longitud</span>
                <input
                  className="gestor-input"
                  type="number"
                  step="0.000001"
                  value={p.lng}
                  onChange={(e) => editar(p.id, { lng: Number(e.target.value) })}
                />
              </label>
            </div>

            <label className="gestor-campo">
              <span>
                <FaStore aria-hidden="true" /> Comercio local asociado
              </span>
              <select
                className="gestor-select"
                value={p.comercioId}
                onChange={(e) => editar(p.id, { comercioId: e.target.value })}
              >
                <option value="">— Sin asignar (solo los más cercanos) —</option>
                {PATROCINADORES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.direccion})
                  </option>
                ))}
              </select>
            </label>

            <label className="gestor-activa">
              <input
                type="checkbox"
                checked={p.activa}
                onChange={(e) => editar(p.id, { activa: e.target.checked })}
              />
              <span>Visible en el mapa público</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default GestorParadas;
