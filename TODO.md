# TODO

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
- [x] Verificar compilación y ejecución
  - [ ] `npm run dev`
  - [ ] Probar selección de recorridos y confirmar fallback

