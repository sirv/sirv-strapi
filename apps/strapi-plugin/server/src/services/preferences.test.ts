import { describe, expect, it } from 'vitest';
import createPreferences from './preferences';

function makeService() {
  const backing = new Map<string, unknown>();
  const strapi: any = {
    store: () => ({
      get: async ({ key }: { key: string }) => backing.get(key) ?? null,
      set: async ({ key, value }: { key: string; value: unknown }) => backing.set(key, value),
    }),
  };
  return createPreferences({ strapi });
}

describe('preferences service', () => {
  it('returns {} when nothing stored', async () => {
    expect(await makeService().read()).toEqual({});
  });

  it('clamps quality to 1-100 and rounds it', async () => {
    const svc = makeService();
    expect((await svc.write({ quality: 150 })).quality).toBe(100);
    expect((await svc.write({ quality: 0 })).quality).toBe(1);
    expect((await svc.write({ quality: 82.6 })).quality).toBe(83);
  });

  it('keeps only known formats', async () => {
    const svc = makeService();
    expect((await svc.write({ format: 'webp' })).format).toBe('webp');
    expect((await svc.write({ format: 'bogus' as any })).format).toBeUndefined();
  });

  it('round-trips saved defaults', async () => {
    const svc = makeService();
    await svc.write({ quality: 70, format: 'optimal' });
    expect(await svc.read()).toEqual({ quality: 70, format: 'optimal' });
  });
});
