// Валидация Telegram Mini App initData (HMAC-SHA256), без фреймворков.
// Спека: docs/context/BACKEND-DECISION.md §1. Наружу не бросает — только ok=false с причиной.
// botToken — только параметр: окружение (TELEGRAM_BOT_TOKEN) читает вызывающий, модуль чистый.

export type InitDataFailureReason =
  | 'invalid_input'
  | 'missing_hash'
  | 'bad_signature'
  | 'missing_auth_date'
  | 'future_auth_date'
  | 'expired'
  | 'missing_user';

export interface InitDataUser {
  id: number;
  [key: string]: unknown;
}

export type InitDataResult =
  | { ok: true; reason: null; userId: number; authDate: number; user: InitDataUser }
  | { ok: false; reason: InitDataFailureReason; userId: null; authDate: number | null };

const encoder = new TextEncoder();
const FUTURE_SKEW_SECONDS = 60;

async function hmacSha256(key: BufferSource, message: string): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
}

function fromHex(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function fail(reason: InitDataFailureReason, authDate: number | null = null): InitDataResult {
  return { ok: false, reason, userId: null, authDate };
}

export async function validateInitData(
  initData: string,
  botToken: string,
  ttlSeconds = 86400,
  now: number = Math.floor(Date.now() / 1000)
): Promise<InitDataResult> {
  try {
    if (!initData || !botToken) return fail('invalid_input');

    const pairs: Array<[string, string]> = [];
    let receivedHash: string | null = null;
    for (const [key, value] of new URLSearchParams(initData)) {
      if (key === 'hash' && receivedHash === null) {
        receivedHash = value;
        continue;
      }
      pairs.push([key, value]);
    }
    if (receivedHash === null || receivedHash === '') return fail('missing_hash');

    pairs.sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0));
    const dataCheckString = pairs.map(([key, value]) => `${key}=${value}`).join('\n');

    const secret = await hmacSha256(encoder.encode('WebAppData'), botToken);
    const expected = await hmacSha256(secret, dataCheckString);
    const received = fromHex(receivedHash);
    if (!received || !constantTimeEqual(expected, received)) return fail('bad_signature');

    const rawAuthDate = pairs.find(([key]) => key === 'auth_date')?.[1];
    const authDate = rawAuthDate === undefined ? Number.NaN : Number(rawAuthDate);
    if (!Number.isFinite(authDate)) return fail('missing_auth_date');
    const age = now - authDate;
    if (age < -FUTURE_SKEW_SECONDS) return fail('future_auth_date', authDate);
    if (age > ttlSeconds) return fail('expired', authDate);

    const rawUser = pairs.find(([key]) => key === 'user')?.[1];
    if (!rawUser) return fail('missing_user', authDate);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawUser);
    } catch {
      return fail('missing_user', authDate);
    }
    if (typeof parsed !== 'object' || parsed === null) return fail('missing_user', authDate);
    const id = (parsed as Record<string, unknown>).id;
    if (typeof id !== 'number' || !Number.isFinite(id)) return fail('missing_user', authDate);

    return { ok: true, reason: null, userId: id, authDate, user: parsed as InitDataUser };
  } catch {
    return fail('invalid_input');
  }
}
