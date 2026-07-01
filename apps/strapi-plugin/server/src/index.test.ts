import { describe, expect, it, vi } from 'vitest';
import plugin from './index';

const fakeStrapi = () => ({ customFields: { register: vi.fn() } }) as any;

describe('server plugin entry', () => {
  it('exposes the full plugin interface', () => {
    for (const key of [
      'register',
      'bootstrap',
      'destroy',
      'config',
      'controllers',
      'routes',
      'services',
      'contentTypes',
      'policies',
      'middlewares',
    ]) {
      expect(plugin).toHaveProperty(key);
    }
  });

  it('registers the sirv-media custom field server-side', () => {
    const strapi = fakeStrapi();
    plugin.register({ strapi });
    expect(strapi.customFields.register).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'sirv-media', plugin: 'sirv', type: 'json' }),
    );
  });

  it('declares admin-only /sirv routes guarded by isAuthenticatedAdmin', () => {
    expect(plugin.routes.admin.type).toBe('admin');
    const settings = plugin.routes.admin.routes.find(
      (r) => r.path === '/settings' && r.method === 'GET',
    );
    expect(settings?.handler).toBe('settings.find');
    for (const route of plugin.routes.admin.routes) {
      expect(route.config?.policies).toContain('admin::isAuthenticatedAdmin');
    }
  });

  it('settings.find reports a connection status without leaking secrets', async () => {
    const strapi: any = {
      plugin: () => ({
        service: () => ({
          getStatus: async () => ({ connected: false }),
          read: async () => ({}),
        }),
      }),
    };
    const ctx: any = {};
    const factory = plugin.controllers.settings;
    expect(factory).toBeTypeOf('function');
    const settings: any = factory?.({ strapi });
    await settings.find(ctx);
    expect(ctx.body).toEqual({ connected: false, defaults: {} });
  });
});
