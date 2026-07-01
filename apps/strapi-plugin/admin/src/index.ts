import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import { SIRV_MEDIA_FIELD } from './custom-fields/sirv-media';
import { getTranslation, prefixPluginTranslations } from './getTranslation';
import { PLUGIN_ID } from './pluginId';

export default {
  register(app: any) {
    // Custom field `plugin::sirv.sirv-media`, usable on any content type.
    app.customFields.register({
      name: SIRV_MEDIA_FIELD,
      pluginId: PLUGIN_ID,
      type: 'json',
      icon: PluginIcon,
      intlLabel: {
        id: getTranslation('sirv-media.label'),
        defaultMessage: 'Sirv media',
      },
      intlDescription: {
        id: getTranslation('sirv-media.description'),
        defaultMessage: 'Pick an image, video, 360 spin or view from your Sirv account.',
      },
      components: {
        Input: async () => import('./custom-fields/sirv-media/SirvMediaInput'),
      },
      options: {
        base: [],
        advanced: [],
      },
    });

    // 3. Settings section -> Sirv configuration page.
    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: getTranslation('settings.section'),
          defaultMessage: 'Sirv',
        },
      },
      [
        {
          intlLabel: {
            id: getTranslation('settings.link'),
            defaultMessage: 'Configuration',
          },
          id: 'sirv-configuration',
          to: `/settings/${PLUGIN_ID}`,
          Component: () => import('./pages/Settings'),
        },
      ],
    );

    // 4. Register the plugin so Strapi tracks readiness.
    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);
          return { data: prefixPluginTranslations(data, PLUGIN_ID), locale };
        } catch {
          return { data: {}, locale };
        }
      }),
    );
  },
};
