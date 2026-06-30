import { PLUGIN_ID } from './pluginId';

/** Namespaces a translation key under the plugin id, e.g. `sirv.plugin.name`. */
export const getTranslation = (id: string): string => `${PLUGIN_ID}.${id}`;

/**
 * Translation JSON files store un-prefixed keys (`menu.label`). Strapi merges all plugin
 * translations into one global bundle, so each key must be namespaced with the plugin id at
 * load time. Mirrors the helper the Strapi plugin SDK template ships.
 */
export const prefixPluginTranslations = (
  data: Record<string, string>,
  pluginId: string = PLUGIN_ID,
): Record<string, string> => {
  return Object.keys(data).reduce<Record<string, string>>((acc, key) => {
    acc[`${pluginId}.${key}`] = data[key] as string;
    return acc;
  }, {});
};
