import { describe, expect, it } from 'vitest';
import { validateInitData } from './initData';

const TOKEN = '123456:TEST-token_ABCDEF';
const NOW = 1_700_000_000;
const enc = new TextEncoder();

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function sign(pairs: Array<[string, string]>, token = TOKEN): Promise<string> {
  const sorted = [...pairs].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const dataCheckString = sorted.map(([k, v]) => `${k}=${v}`).join('\n');
  const key = await crypto.subtle.importKey('raw', enc.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const secret = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(token)));
  const secretKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(new Uint8Array(await crypto.subtle.sign('HMAC', secretKey, enc.encode(dataCheckString))));
}

async function build(pairs: Array<[string, string]>, token = TOKEN): Promise<string> {
  const hash = await sign(pairs, token);
  const params = new URLSearchParams();
  for (const [k, v] of pairs) params.append(k, v);
  params.append('hash', hash);
  return params.toString();
}

const basePairs = (overrides: Record<string, string> = {}): Array<[string, string]> => {
  const values: Record<string, string> = {
    auth_date: String(NOW),
    query_id: 'AAHtest',
    user: JSON.stringify({ id: 4242, first_name: 'Иван', username: 'ivan' }),
    ...overrides
  };
  return Object.entries(values);
};

describe('validateInitData', () => {
  it('принимает валидный initData и отдаёт user.id', async () => {
    const result = await validateInitData(await build(basePairs()), TOKEN, 86400, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe(4242);
      expect(result.user.username).toBe('ivan');
      expect(result.authDate).toBe(NOW);
    }
  });

  it('не зависит от порядка полей', async () => {
    const pairs = [...basePairs()].reverse();
    const result = await validateInitData(await build(pairs), TOKEN, 86400, NOW);
    expect(result.ok).toBe(true);
  });

  it('сохраняет пустые значения полей (keep_blank_values)', async () => {
    const pairs = basePairs({ query_id: '' });
    const result = await validateInitData(await build(pairs), TOKEN, 86400, NOW);
    expect(result.ok).toBe(true);
  });

  it('сохраняет дублирующийся ключ', async () => {
    const pairs: Array<[string, string]> = [...basePairs(), ['query_id', 'second']];
    const result = await validateInitData(await build(pairs), TOKEN, 86400, NOW);
    expect(result.ok).toBe(true);
  });

  it('декодирует URL-кодированные значения до сверки', async () => {
    const pairs = basePairs({ user: JSON.stringify({ id: 7, first_name: 'Иван Петров' }) });
    const result = await validateInitData(await build(pairs), TOKEN, 86400, NOW);
    expect(result.ok).toBe(true);
  });

  it('отказывает без hash', async () => {
    const params = new URLSearchParams();
    for (const [k, v] of basePairs()) params.append(k, v);
    const result = await validateInitData(params.toString(), TOKEN, 86400, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'missing_hash' });
  });

  it('отказывает на битом hash', async () => {
    const result = await validateInitData((await build(basePairs())).replace(/hash=[0-9a-f]+/, 'hash=zzzz'), TOKEN, 86400, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'bad_signature' });
  });

  it('отказывает при подмене поля', async () => {
    const signed = await build(basePairs());
    const result = await validateInitData(signed.replace('4242', '9999'), TOKEN, 86400, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'bad_signature' });
  });

  it('отказывает на чужом токене', async () => {
    const result = await validateInitData(await build(basePairs(), 'other:token'), TOKEN, 86400, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'bad_signature' });
  });

  it('отказывает при просроченном auth_date', async () => {
    const pairs = basePairs({ auth_date: String(NOW - 86401) });
    const result = await validateInitData(await build(pairs), TOKEN, 86400, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'expired' });
  });

  it('отказывает при auth_date из будущего больше 60 с', async () => {
    const pairs = basePairs({ auth_date: String(NOW + 61) });
    const result = await validateInitData(await build(pairs), TOKEN, 86400, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'future_auth_date' });
  });

  it('допускает будущее в пределах 60 с', async () => {
    const pairs = basePairs({ auth_date: String(NOW + 60) });
    const result = await validateInitData(await build(pairs), TOKEN, 86400, NOW);
    expect(result.ok).toBe(true);
  });

  it('отказывает без auth_date', async () => {
    const pairs = basePairs();
    const result = await validateInitData(await build(pairs.filter(([k]) => k !== 'auth_date')), TOKEN, 86400, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'missing_auth_date' });
  });

  it('отказывает без user', async () => {
    const result = await validateInitData(await build(basePairs().filter(([k]) => k !== 'user')), TOKEN, 86400, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'missing_user' });
  });

  it('отказывает, если в user нет id', async () => {
    const pairs = basePairs({ user: JSON.stringify({ first_name: 'Без id' }) });
    const result = await validateInitData(await build(pairs), TOKEN, 86400, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'missing_user' });
  });

  it('отказывает на невалидном JSON user', async () => {
    const pairs = basePairs({ user: '{not json' });
    const result = await validateInitData(await build(pairs), TOKEN, 86400, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'missing_user' });
  });

  it('не бросает на мусорном вводе', async () => {
    await expect(validateInitData('%%%', TOKEN)).resolves.toMatchObject({ ok: false });
    await expect(validateInitData('', '')).resolves.toMatchObject({ ok: false, reason: 'invalid_input' });
  });
});
