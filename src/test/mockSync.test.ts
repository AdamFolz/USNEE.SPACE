import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-ignore plain .mjs dev server, no types
import { startMockSyncServer } from '../../server/mock-sync.mjs';

interface MockInstance {
  server: { close: () => void };
  port: number;
}

interface Operation {
  operationId: string;
  entityId: string;
  entityType: string;
  kind: string;
  payload: Record<string, unknown>;
}

let base = '';
let instance: MockInstance;

const operation = (id = 'op-1'): Operation => ({ operationId: id, entityId: 'entity-1', entityType: 'entry', kind: 'create', payload: {} });

async function post(path: string, body: Operation, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': 'init-data', 'Idempotency-Key': body.operationId, ...headers },
    body: JSON.stringify(body)
  });
}

beforeAll(async () => {
  instance = (await startMockSyncServer(0)) as MockInstance;
  base = `http://127.0.0.1:${instance.port}`;
});

afterAll(() => {
  instance.server.close();
});

describe('mock sync server', () => {
  it('accepts an operation with initData and answers with an acknowledgement', async () => {
    const response = await post('/api/sync/operations', operation('op-a'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('accepted');
    expect(body.revision).toBe(1);
    expect(body.operationId).toBe('op-a');
    expect(typeof body.serverTime).toBe('string');
  });

  it('is idempotent by operation id', async () => {
    const first = await (await post('/api/sync/operations', operation('op-b'))).json();
    const second = await (await post('/api/sync/operations', operation('op-b'))).json();
    expect(second.status).toBe('duplicate');
    expect(second.revision).toBe(first.revision);
  });

  it('rejects a request without initData', async () => {
    const response = await fetch(base + '/api/sync/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation('op-c'))
    });
    expect(response.status).toBe(401);
  });

  it('serves the forced conflict branch', async () => {
    const response = await post('/api/sync/operations?force=conflict', operation('op-d'));
    const body = await response.json();
    expect(body.status).toBe('conflict');
    expect(body.errorCode).toBe('REVISION_MISMATCH');
  });

  it('serves the forced rejected branch', async () => {
    const body = await (await post('/api/sync/operations?force=rejected', operation('op-e'))).json();
    expect(body.status).toBe('rejected');
  });

  it('reports health', async () => {
    const body = await (await fetch(base + '/api/health')).json();
    expect(body.ok).toBe(true);
  });
});
