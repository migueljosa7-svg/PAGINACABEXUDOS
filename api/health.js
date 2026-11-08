import { storageMode, send } from './_lib/gps.js';

export default function handler(_req, res) {
  send(res, 200, { status: 'ok', storage: storageMode, timestamp: Date.now() });
}
