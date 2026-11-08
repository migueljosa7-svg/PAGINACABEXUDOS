# Despliegue en Vercel

La web (Vite) y el relay GPS (funciones en `api/`) viven en el mismo proyecto de Vercel.
No hace falta Render.

## Arquitectura

```
Móvil (emisor)  --POST /api/gps/push-->  Redis  <--GET /api/location/latest--  Visores (web)
```

| Endpoint | Para qué |
|---|---|
| `POST /api/gps/auth` | El emisor valida su token |
| `POST /api/gps/push` | El emisor envía su posición |
| `GET /api/location/latest?token=` | Los visores leen la posición (caché de borde 1 s) |
| `POST /api/viewers/ping` | Latido anónimo de espectadores (afluencia) |
| `GET /api/paradas` | Paradas públicas del recorrido |
| `GET /api/municipal/resumen`, `/salas` | Panel municipal (cabecera `x-panel-token`) |
| `POST /api/municipal/paradas` | Edición de paradas desde el panel |
| `POST /api/asistente` | IA opcional del asistente (necesita `ANTHROPIC_API_KEY`) |
| `GET /api/health` | Estado; `storage` debe ser `redis` |

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Obligatoria | Ejemplo / nota |
|---|---|---|
| `AUTHORIZED_GPS_DEVICES` | Sí | `{ "cmp_prueba_barrio": { "name": "Comparsa San José (demo)" } }` |
| `GPS_DEMO_TOKENS` | No | `cmp_prueba_barrio:Comparsa San Jose (demo)`. Relaja precisión a 500 m (solo demo) |
| `GPS_DEMO_ALLOW_OUTSIDE_GEOFENCE` | No | `1` para probar fuera de Zaragoza (quitar en real) |
| `MUNICIPAL_PANEL_TOKEN` | Para el panel | Contraseña del panel municipal |
| `HEALTH_TOKEN` | No | Con `?key=` muestra más datos en `/api/health` |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Sí (producción) | Las crea solas la integración de Redis |
| `ANTHROPIC_API_KEY` | No | Activa respuestas con IA en el asistente |

Tras cambiar variables hay que hacer **Redeploy**.

## Redis (obligatorio)

Vercel → tu proyecto → **Storage** → **Marketplace** → **Upstash Redis** → *Connect to Project*.
Después **Redeploy** y abre `/api/health`: debe devolver `"storage":"redis"`.

## Pasar de demo a datos reales

1. **Tokens reales:** genera uno por comparsa (`npm run generate-env` no existe en Vercel; usa
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) y ponlos en
   `AUTHORIZED_GPS_DEVICES`: `{ "<token>": { "name": "Comparsa de Delicias" } }`.
   El enlace del móvil será `https://TU-DOMINIO/gps-emisor?token=<token>`.
2. **Quita** `GPS_DEMO_TOKENS` y `GPS_DEMO_ALLOW_OUTSIDE_GEOFENCE` (vuelve la precisión estricta de 30 m).
3. **Cambia** `MUNICIPAL_PANEL_TOKEN` y `HEALTH_TOKEN`.
4. **Agenda:** edita `src/data/calendarData.ts`. Los actos de demostración están al final
   (`DEMO_EVENT_ROWS`): bórralos y añade los oficiales.
5. **Logo del Ayuntamiento:** coloca la imagen en `public/` y añádela en `src/components/FooterConsent.tsx`.

## Probar en local como en Vercel

```bash
npm run build
AUTHORIZED_GPS_DEVICES='{"cmp_prueba_barrio":{"name":"Demo"}}' npm run dev:vercel
# http://localhost:3000  (usa memoria en vez de Redis)
```
