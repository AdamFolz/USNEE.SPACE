import { createServer } from 'node:http';

/**
 * Локальный мок синхронизации. Нужен только для разработки: включает
 * настоящий outbox-транспорт без VPS. Никакой персистентности — всё в памяти.
 */

const SEEN = new Map();

function json(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, Idempotency-Key',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  });
  res.end(payload);
}

export function createMockSyncServer(options = {}) {
  const state = { revisions: new Map(), seen: SEEN, requests: [] };
  const force = options.force ?? null;

  const server = createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data, Idempotency-Key',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/api/health') {
      json(res, 200, { ok: true, handled: state.requests.length });
      return;
    }

    if (req.method !== 'POST' || !req.url?.startsWith('/api/sync/operations')) {
      json(res, 404, { error: 'not_found' });
      return;
    }

    const initData = req.headers['x-telegram-init-data'];
    const key = req.headers['idempotency-key'];
    if (!initData) {
      json(res, 401, { error: 'missing_init_data' });
      return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let operation;
    try {
      operation = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      json(res, 400, { error: 'invalid_json' });
      return;
    }
    if (!operation?.operationId || !operation?.entityId) {
      json(res, 400, { error: 'invalid_operation' });
      return;
    }

    state.requests.push({ operationId: operation.operationId, kind: operation.kind });
    const ack = (status, extra = {}) =>
      json(res, 200, {
        operationId: operation.operationId,
        entityId: operation.entityId,
        status,
        serverTime: new Date().toISOString(),
        ...extra
      });

    if (key && state.seen.has(key)) {
      ack('duplicate', { revision: state.seen.get(key) });
      return;
    }

    const forced = force ?? new URL(req.url, 'http://local').searchParams.get('force');
    if (forced === 'conflict') {
      ack('conflict', { errorCode: 'REVISION_MISMATCH' });
      return;
    }
    if (forced === 'rejected') {
      ack('rejected', { errorCode: 'VALIDATION_FAILED' });
      return;
    }

    const revision = (state.revisions.get(operation.entityId) ?? 0) + 1;
    state.revisions.set(operation.entityId, revision);
    if (key) state.seen.set(key, revision);
    ack('accepted', { revision });
  });

  return { server, state };
}

export function startMockSyncServer(port = 8788, host = '127.0.0.1') {
  const { server, state } = createMockSyncServer();
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      resolve({ server, state, port: server.address().port });
    });
  });
}

if (process.argv[1] && process.argv[1].endsWith('mock-sync.mjs')) {
  const port = Number(process.env.PORT ?? 8788);
  // На внешнем хостинге (Wispbyte/Pterodactyl) нужен HOST=0.0.0.0,
  // иначе сервер слушает только петлю и снаружи недоступен.
  const host = process.env.HOST ?? '127.0.0.1';
  const { server } = createMockSyncServer();
  server.listen(port, host, () => {
    console.log(`mock sync API on http://${host}:${port}`);
    console.log('use VITE_API_BASE_URL=http://' + host + ':' + port);
    console.log('force branches: POST /api/sync/operations?force=conflict|rejected');
  });
}
