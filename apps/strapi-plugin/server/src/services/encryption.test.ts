import { describe, expect, it } from 'vitest';
import createEncryption from './encryption';

const makeService = (keys: unknown = ['k1-abcdef', 'k2-ghijkl']) =>
  createEncryption({ strapi: { config: { get: () => keys } } } as any);

describe('encryption service', () => {
  it('round-trips plaintext through encrypt/decrypt', () => {
    const svc = makeService();
    const secret = JSON.stringify({ clientId: 'id', clientSecret: 'shh', accountAlias: 'demo' });
    const enc = svc.encrypt(secret);
    expect(enc).not.toContain('shh');
    expect(svc.decrypt(enc)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const svc = makeService();
    expect(svc.encrypt('same')).not.toBe(svc.encrypt('same'));
  });

  it('fails to decrypt tampered ciphertext (GCM auth tag)', () => {
    const svc = makeService();
    const enc = svc.encrypt('secret');
    const tampered = `${enc.slice(0, -4)}AAAA`;
    expect(() => svc.decrypt(tampered)).toThrow();
  });

  it('cannot decrypt with a different key (APP_KEYS rotation)', () => {
    const enc = makeService(['original-key']).encrypt('secret');
    expect(() => makeService(['rotated-key']).decrypt(enc)).toThrow();
  });

  it('throws when APP_KEYS is missing', () => {
    const svc = createEncryption({ strapi: { config: { get: () => undefined } } } as any);
    expect(() => svc.encrypt('x')).toThrow(/APP_KEYS/);
  });
});
