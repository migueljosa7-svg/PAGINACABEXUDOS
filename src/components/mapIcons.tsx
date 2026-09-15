/**
 * Iconografía personalizada de comparsas para mapas Leaflet.
 *
 * Sustituye las chinchetas estándar por un avatar circular con el logo de la
 * comparsa (borde circular, sombra suave y tamaño adaptativo al zoom).
 *
 * Convención de assets (sin configuración):
 *   public/icons/comparsas/<slug-del-nombre>.png   (ej. "Recorrido Oficial" -> recorrido-oficial.png)
 *   public/icons/comparsas/default.svg             (fallback automático)
 *
 * Si no existe el PNG, se muestra el fallback (SVG por defecto y, en último
 * caso, la inicial/emoji) para que el marcador NUNCA quede en blanco.
 */

import L from 'leaflet';
import { useEffect, useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import '../styles/comparsaMarker.css';

const DEFAULT_LOGO = '/icons/comparsas/default.svg';

/** Normaliza un nombre a slug seguro para nombre de fichero/URL. */
export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'comparsa';
}

/** URL del logo de una comparsa según la convención de assets. */
export function comparsaLogoUrl(name: string): string {
  return `/icons/comparsas/${slugify(name)}.png`;
}

/** Escapa texto para interpolación segura en HTML del divIcon (evita XSS). */
function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Tamaño del marcador (px) adaptado al nivel de zoom del mapa. */
export function comparsaIconSizeForZoom(zoom?: number): number {
  if (zoom == null) return 42;
  if (zoom <= 13) return 30;
  if (zoom <= 14) return 34;
  if (zoom <= 15) return 38;
  if (zoom <= 17) return 46;
  return 52;
}

export interface ComparsaIconOptions {
  /** Nivel de zoom actual: ajusta el tamaño del icono (tamaño adaptativo). */
  zoom?: number;
  /** Fuerza un tamaño concreto (ignora el zoom). */
  size?: number;
  /** Color del borde circular y del pulso. */
  color?: string;
  /** Etiqueta bajo el marcador (nombre visible). */
  label?: string;
  /** Texto/emoji mostrado si falla el logo (p. ej. la inicial). */
  fallbackText?: string;
  /** Activa el anillo de pulso (posición en vivo). */
  pulse?: boolean;
}

/**
 * Crea un L.divIcon con avatar circular de la comparsa.
 *
 * @param logoUrl URL del logo (p. ej. comparsaLogoUrl(nombre)). Si falla la
 *                carga, el helper hace fallback a default.svg y, si también
 *                falla, muestra `fallbackText`.
 */
export function createComparsaIcon(logoUrl: string | null | undefined, options: ComparsaIconOptions = {}): L.DivIcon {
  const {
    zoom,
    size,
    color = '#D1121F',
    label = '',
    fallbackText = '',
    pulse = false,
  } = options;

  const px = size ?? comparsaIconSizeForZoom(zoom);
  const inner = Math.round(px * 0.68); // avatar interior proporcional
  const border = Math.max(2, Math.round(px * 0.07));
  const safeLabel = escapeHtml(label);
  const safeFallback = escapeHtml(fallbackText);
  const url = logoUrl || DEFAULT_LOGO;

  // La etiqueta de fallback SIEMPRE está debajo de la imagen: si el logo no
  // carga (dos errores seguidos), la imagen se oculta y aparece el fallback.
  const html = `
    <div class="comparsa-marker" style="--comparsa-color:${color}">
      <div class="comparsa-marker-ring${pulse ? ' is-pulse' : ''}"
           style="width:${px}px;height:${px}px;border-width:${border}px;box-shadow:0 4px 10px rgba(0,0,0,.35)">
        <div class="comparsa-marker-inner" style="width:${inner}px;height:${inner}px">
          <span class="comparsa-marker-fallback">${safeFallback}</span>
          <img class="comparsa-marker-logo" src="${escapeHtml(url)}" alt="${safeLabel || 'Comparsa'}"
               onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${DEFAULT_LOGO}';}else{this.style.display='none';}" />
        </div>
      </div>
      ${safeLabel ? `<div class="comparsa-marker-label">${safeLabel}</div>` : ''}
    </div>
  `;

  const anchorX = Math.round(px / 2);
  return L.divIcon({
    className: 'comparsa-icon-wrapper',
    html,
    iconSize: [px, px + (safeLabel ? 16 : 0)],
    iconAnchor: [anchorX, px],
    popupAnchor: [0, -(px + 6)],
  });
}

/**
 * Observa el zoom del mapa y lo comunica al árbol React (para iconos
 * adaptativos). Debe renderizarse DENTRO de <MapContainer>.
 */
export function MapZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    if (zoom != null) onZoomChange(zoom);
  }, [zoom, onZoomChange]);

  useMapEvents({
    zoomend: (event) => setZoom(event.target.getZoom()),
  });

  return null;
}
