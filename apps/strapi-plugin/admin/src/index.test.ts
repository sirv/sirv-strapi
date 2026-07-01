import { describe, expect, it, vi } from 'vitest';
import plugin from './index';
import { PLUGIN_ID } from './pluginId';

describe('admin plugin entry', () => {
  it('registers the custom field, settings section and plugin', () => {
    const app = {
      customFields: { register: vi.fn() },
      createSettingSection: vi.fn(),
      registerPlugin: vi.fn(),
    };

    plugin.register(app as any);

    // Custom field plugin::sirv.sirv-media
    expect(app.customFields.register).toHaveBeenCalledTimes(1);
    expect(app.customFields.register.mock.calls[0]?.[0]).toMatchObject({
      name: 'sirv-media',
      pluginId: PLUGIN_ID,
      type: 'json',
    });

    // Settings section
    expect(app.createSettingSection).toHaveBeenCalledTimes(1);
    expect(app.createSettingSection.mock.calls[0]?.[0]).toMatchObject({ id: PLUGIN_ID });

    // Plugin registration
    expect(app.registerPlugin).toHaveBeenCalledTimes(1);
    expect(app.registerPlugin.mock.calls[0]?.[0]).toMatchObject({ id: PLUGIN_ID });
  });

  it('returns translation bundles for requested locales', async () => {
    const trads = await plugin.registerTrads({ locales: ['en'] });
    expect(trads).toHaveLength(1);
    expect(trads[0]?.locale).toBe('en');
    expect(trads[0]?.data).toHaveProperty('sirv.settings.title');
  });
});
