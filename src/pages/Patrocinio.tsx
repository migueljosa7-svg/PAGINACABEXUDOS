/**
 * PÁGINA DE PATROCINIO — alta de hostelería y comercio local.
 *
 * Es la cara "antes de salir" del módulo: aquí no hay posición GPS, así que la
 * cercanía se mide contra el TRAZADO del recorrido de referencia
 * (`patrociniosSobreRecorrido`). Cuando la comparsa está en marcha, quien mira
 * `/gps-live` ve el mismo catálogo recalculado contra su posición real, que es
 * cuando el local se destaca de verdad.
 *
 * El mapa va en un chunk lazy (`PatrocinioMap`), igual que en el visor: la
 * ficha de alta, el aviso y los filtros se ven de inmediato en 4G.
 */

import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaInfoCircle, FaMapMarkerAlt, FaStore } from 'react-icons/fa';
import { PROGRAMA_RUTA_ID, recorridoPrograma } from '../data/programaDelDia';
import {
  PATROCINIO_AVISO_DEMO,
  PATROCINIO_CATEGORIAS,
  PATROCINIO_CATEGORIA_COLOR,
  PATROCINIO_CATEGORIA_GLYPH,
  PATROCINIO_CATEGORIA_LABEL,
  PATROCINIO_NIVEL_LABEL,
  type PatrocinioCategoria,
} from '../data/patrocinadores';
import {
  patrociniosSobreRecorrido,
  textoDistanciaPatrocinio,
} from '../services/patrocinio';
import MapLayerSwitch from '../components/maps/MapLayerSwitch';
import type { MapLayerKey } from '../components/maps/mapLayers';
import '../styles/patrocinio.css';

const PatrocinioMap = lazy(() => import('../components/maps/PatrocinioMap'));

/** Recorrido de referencia: waypoints para Leaflet y los mismos como {lat,lng}. */
function useRecorridoReferencia() {
  return useMemo(() => {
    const puntos = recorridoPrograma();
    const recorrido: [number, number][] = puntos.map((p) => [p.lat, p.lng]);
    const center: [number, number] = recorrido.length
      ? recorrido[Math.floor(recorrido.length / 2)]
      : [41.6563, -0.8789];
    return { recorrido, center, puntos };
  }, []);
}

export const Patrocinio: React.FC = () => {
  const [categorias, setCategorias] = useState<PatrocinioCategoria[]>([]);
  const [layer, setLayer] = useState<MapLayerKey>('estandar');
  const { recorrido, center, puntos } = useRecorridoReferencia();

  // CERCANÍA AL RECORRIDO PREVISTO: la página no tiene posición en marcha, así
  // que la distancia se mide al trazado, no a un waypoint suelto.
  const locais = useMemo(
    () => patrociniosSobreRecorrido(puntos, { solo: categorias.length ? categorias : undefined }),
    [puntos, categorias],
  );

  const alternarCategoria = (cat: PatrocinioCategoria) => {
    setCategorias((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  return (
    <div className="patrocinio-page">
      <header className="patrocinio-hero">
        <h1>Patrocinio: hostelería y comercio local</h1>
        <p>
          Bares, restaurantes y comercios del Casco Histórico que aparecen en el mapa junto a la
          comparsa. A diferencia del programa impreso, aquí se actualiza solo: cuando la cabalgata
          se acerca a tu puerta, tu local se destaca en el mapa.
        </p>
      </header>

      <div className="patrocinio-wrap">
        <div className="patrocinio-demo-note" role="note">
          <FaInfoCircle aria-hidden="true" />
          <span>{PATROCINIO_AVISO_DEMO}</span>
        </div>

        <div className="patrocinio-map-wrap">
          <Suspense
            fallback={
              <div className="patrocinio-map-placeholder" role="status" aria-live="polite">
                Cargando mapa de patrocinadores…
              </div>
            }
          >
            <PatrocinioMap
              recorrido={recorrido}
              locais={locais}
              layer={layer}
              center={center}
            />
          </Suspense>
        </div>

        <MapLayerSwitch active={layer} onChange={setLayer} />

        <div className="patrocinio-filters" role="group" aria-label="Filtrar por categoría">
          {PATROCINIO_CATEGORIAS.map((cat) => (
            <button
              key={cat}
              type="button"
              className="patrocinio-chip"
              style={{ '--chip-color': PATROCINIO_CATEGORIA_COLOR[cat] } as React.CSSProperties}
              onClick={() => alternarCategoria(cat)}
              aria-pressed={categorias.includes(cat)}
            >
              <span className="patrocinio-chip-dot" aria-hidden="true" />
              {PATROCINIO_CATEGORIA_LABEL[cat]}
            </button>
          ))}
        </div>

        <p
          style={{
            fontSize: '0.82rem',
            color: 'hsl(var(--color-text-secondary))',
            margin: '0 0 12px',
          }}
        >
          {locais.length} {locais.length === 1 ? 'local' : 'locales'} sobre el trazado de
          referencia (<code>{PROGRAMA_RUTA_ID}</code>). La distancia se mide contra la ruta
          prevista; en marcha, el visor en vivo la recalcula contra la posición real de la
          comparsa.
        </p>

        <div className="patrocinio-grid">
          {locais.map((p) => (
            <article
              key={p.id}
              className={`patrocinio-card${
                p.proximidad === 'destacado' ? ' is-destacado' : ''
              }`}
              style={
                { '--pat-color': PATROCINIO_CATEGORIA_COLOR[p.categoria] } as React.CSSProperties
              }
            >
              <div className="patrocinio-card-top">
                <h2 className="patrocinio-card-name">
                  <span aria-hidden="true">{PATROCINIO_CATEGORIA_GLYPH[p.categoria]}</span>
                  {p.nombre}
                </h2>
                <span className={`patrocinio-nivel is-${p.nivel}`}>
                  {PATROCINIO_NIVEL_LABEL[p.nivel]}
                </span>
              </div>
              <p className="patrocinio-card-gancho">{p.gancho}</p>
              <p className="patrocinio-card-desc">{p.descripcion}</p>
              <div className="patrocinio-card-meta">
                <span>
                  <FaMapMarkerAlt aria-hidden="true" /> {p.direccion}
                </span>
                <span className="patrocinio-dist">{textoDistanciaPatrocinio(p)}</span>
                {p.franja && <span>{p.franja}</span>}
                {p.demostracion && <span className="patrocinio-demo-tag">Ficha ejemplo</span>}
              </div>
            </article>
          ))}
        </div>

        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Link to="/gps-live" className="btn-secondary">
            <FaStore aria-hidden="true" /> Ver en el mapa en vivo
          </Link>
          <Link to="/recorridos" className="btn-secondary">
            Ver el recorrido previsto
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Patrocinio;

