import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'aethermap-rust-master-secret-key-2026';

export function generateSessionToken(sessionId: string): { token: string; timestamp: number } {
  const timestamp = Date.now();
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(`${sessionId}:${timestamp}`);
  const signature = hmac.digest('hex');
  return {
    token: `${sessionId}.${timestamp}.${signature.slice(0, 16)}`,
    timestamp,
  };
}

export function verifySessionToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [sessionId, timestampStr, providedSig] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(`${sessionId}:${timestamp}`);
  const expectedSig = hmac.digest('hex').slice(0, 16);

  return crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig));
}

export function computeStateChecksum(data: object): string {
  const str = JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 12);
}
