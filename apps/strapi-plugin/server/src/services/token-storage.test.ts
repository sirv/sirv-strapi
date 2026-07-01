import { describe, expect, it } from 'vitest';
import createEncryption from './encryption';
import createTokenStorage from './token-storage';

/**
 * Builds a token-storage service backed by an in-memory plugin store and the REAL encryption
 * service, so the test asserts the full persist path (encrypt -> store -> decrypt -> validate).
 */
function makeStorage() {
  const backing = new Map<string, unknown>();
  const encryption = createEncryption({
    strapi: { config: { get: () => ['app-key-1', 'app-key-2'] } },
  } as any);

  const strapi: any = {
    store: () => ({
      get: async ({ key }: { key: string }) => backing.get(key) ?? null,
      set: async ({ key, value }: { key: string; value: unknown }) => backing.set(key, value),
      delete: async ({ key }: { key: string }) => backing.delete(key),
    }),
    plugin: () => ({ service: () => encryption }),
  };

  return { storage: createTokenStorage({ strapi }), backing };
}

const creds = { clientId: 'cid', clientSecret: 'shh-secret', accountAlias: 'demo' };

describe('token-storage service', () => {
  it('returns null when nothing is stored', async () => {
    const { storage } = makeStorage();
    expect(await storage.read()).toBeNull();
  });

  it('persists credentials encrypted and reads them back', async () => {
    const { storage, backing } = makeStorage();
    await storage.write(creds);

    const raw = backing.get('credentials');
    expect(typeof raw).toBe('string');
    // Stored blob must not contain the plaintext secret.
    expect(raw).not.toContain('shh-secret');

    expect(await storage.read()).toEqual(creds);
  });

  it('clears stored credentials', async () => {
    const { storage } = makeStorage();
    await storage.write(creds);
    await storage.clear();
    expect(await storage.read()).toBeNull();
  });

  it('returns null for an undecryptable blob (e.g. APP_KEYS rotated)', async () => {
    const { storage, backing } = makeStorage();
    backing.set('credentials', 'not-valid-base64-ciphertext');
    expect(await storage.read()).toBeNull();
  });
});
