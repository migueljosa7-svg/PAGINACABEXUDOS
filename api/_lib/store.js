// Almacén clave-valor para las funciones serverless de Vercel.
//
// Producción: Redis por REST (Upstash vía Marketplace de Vercel; inyecta
// KV_REST_API_URL y KV_REST_API_TOKEN). Sin Redis: Map en memoria, solo válido
// para desarrollo porque cada invocación puede caer en otra instancia.

/** Quita comillas/espacios que se cuelan al pegar valores en el panel de Vercel. */
const cleanEnv = (v) => String(v || '').trim().replace(/^['"]|['"]$/g, '');

const REDIS_URL = cleanEnv(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL).replace(/\/$/, '');
const REDIS_TOKEN = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);

export const storageMode = REDIS_URL && REDIS_TOKEN ? 'redis' : 'memory';

const mem = globalThis.__pcxMem || (globalThis.__pcxMem = { kv: new Map(), sets: new Map(), viewers: new Map() });

async function call(path, body) {
  const res = await fetch(`${REDIS_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return res.json();
}

async function cmd(command) {
  const json = await call('', command);
  if (json.error) throw new Error(json.error);
  return json.result;
}

/** Lee un JSON (o null). */
export async function getJson(key) {
  if (storageMode === 'redis') {
    const raw = await cmd(['GET', key]);
    return raw ? JSON.parse(raw) : null;
  }
  const e = mem.kv.get(key);
  return e && (!e.expires || e.expires > Date.now()) ? e.value : null;
}

/** Guarda un JSON; `ttlSeconds` opcional. */
export async function setJson(key, value, ttlSeconds) {
  if (storageMode === 'redis') {
    await cmd(ttlSeconds ? ['SET', key, JSON.stringify(value), 'EX', ttlSeconds] : ['SET', key, JSON.stringify(value)]);
  } else {
    mem.kv.set(key, { value, expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0 });
  }
}

export async function setAdd(key, member) {
  if (storageMode === 'redis') {
    await cmd(['SADD', key, member]);
    await cmd(['EXPIRE', key, 7 * 24 * 3600]);
  } else {
    (mem.sets.get(key) || mem.sets.set(key, new Set()).get(key)).add(member);
  }
}

export async function setMembers(key) {
  if (storageMode === 'redis') return (await cmd(['SMEMBERS', key])) || [];
  return [...(mem.sets.get(key) || [])];
}

const VIEWER_WINDOW_MS = 45_000;

/** Registra un espectador vivo (latido) y devuelve cuántos hay en la ventana. */
export async function touchViewer(room, viewerId) {
  const now = Date.now();
  const key = `pcx:viewers:${room}`;
  if (storageMode === 'redis') {
    const out = await call('/pipeline', [
      ['ZADD', key, now, viewerId],
      ['ZREMRANGEBYSCORE', key, 0, now - VIEWER_WINDOW_MS],
      ['EXPIRE', key, 120],
      ['ZCARD', key],
    ]);
    return Number(out?.[3]?.result) || 0;
  }
  const m = mem.viewers.get(key) || mem.viewers.set(key, new Map()).get(key);
  m.set(viewerId, now);
  for (const [id, t] of m) if (now - t > VIEWER_WINDOW_MS) m.delete(id);
  return m.size;
}

export async function countViewers(room) {
  const now = Date.now();
  const key = `pcx:viewers:${room}`;
  if (storageMode === 'redis') {
    return Number(await cmd(['ZCOUNT', key, now - VIEWER_WINDOW_MS, '+inf'])) || 0;
  }
  const m = mem.viewers.get(key);
  if (!m) return 0;
  return [...m.values()].filter((t) => now - t <= VIEWER_WINDOW_MS).length;
}
