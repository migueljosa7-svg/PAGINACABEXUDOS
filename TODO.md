# TODO - Fix WebSocket 1006 (Render)

- [ ] Inspect/confirm Render deployment of `gps-relay-server` (domain/endpoint)
- [ ] Update `render.yaml` to deploy the relay server as a separate Render web service (optional if already deployed)
- [x] Add `VITE_WS_RELAY_URL` env var to the frontend Render service to point to relay WS host
- [ ] Rebuild/redeploy frontend and relay
- [ ] Verify WS connectivity: sender to relay (role=sender) returns `gps_authorized`
- [ ] Verify receiver (`GpsLive`) connects (role=receiver) and receives `room_info` and `gps` messages

