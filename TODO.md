## OSRM para Recorridos (React Leaflet)
- [ ] Actualizar `src/pages/Recorridos.tsx` para usar OSRM (caché + fallback):
  - [ ] Añadir estado para geometría OSRM y métricas (distancia segmentada)
  - [ ] Llamar `fetchOSRMRoute()` al cambiar `selectedRouteId`/waypoints
  - [ ] Fallback automático a lógica actual si OSRM falla
  - [ ] Dibujar polyline usando geometría OSRM cuando exista
  - [ ] Calcular progreso/animación usando distancia OSRM
- [ ] Implementar caché de rutas en `Recorridos.tsx` (memoria) para evitar consultas repetidas
  - [ ] Cache por clave basada en waypoints (orden y coords con precisión)
- [ ] Optimizar rendimiento para no afectar fluidez
  - [ ] Evitar recalcular métricas en cada render (useMemo/useRef)
  - [ ] Cancelar/ignorar respuestas obsoletas al cambiar de ruta

## GPS Relay + GPS Live
- [x] Crear ruta `/gps-live` y página `src/pages/GpsLive.tsx`
- [x] Servidor GPS Relay producción (CORS, health, logs, rooms por routeId)
- [x] `GPSPositionSource` preparado para recibir GPS por WebSocket
- [x] Sender HTML móvil mejorado y compatible con `/sender.html?role=sender&routeId=...`
- [x] Compilación y build pasan (`npm run build`)

## Checklist pendiente
- [ ] Identificar errores exactos de consola (primeros 10-20) y stacktrace
- [ ] Probar en runtime: cambiar ruta, play/pause, arrastrar mapa, hacer click en el marcador

