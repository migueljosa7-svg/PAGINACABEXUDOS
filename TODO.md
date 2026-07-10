# TODO - GPS relay + “Prueba Barrio”

- [x] Servidor: eliminar lógica legacy basada en routeId/GPS_KEY_* / localhost y dejar contrato por AUTHORIZED_GPS_DEVICES.
- [x] Servidor: validar tokens solo en servidor.
- [x] Servidor: mantener última posición por token y reenviar a todos los clientes del token.
- [x] Servidor: eliminar envío/recepción por routeId; el canal será token.
- [x] Servidor: ajustar mensajes a frontend (sender_connected/unauthorized etc. si aplica).
- [ ] Frontend: adaptar GPSPositionSource para el nuevo formato (token en query, recibir por token).
- [ ] Frontend: crear recorrido “Prueba Barrio” en datos (San José sencillo) y añadirlo al listado.
- [ ] Frontend: al seleccionar “Prueba Barrio”, usar token `cmp_prueba_barrio` y mover el marcador en tiempo real.
- [ ] Limpieza: eliminar SOLO código GPS obsoleto (localhost, routeId para GPS, GPS_KEY_*, pruebas antiguas, lógica experimental / dead code) sin romper otras partes.
- [ ] Render: revisar Docker/entrypoints para que despliegue directo.
- [ ] Ejecutar build y pruebas básicas.

