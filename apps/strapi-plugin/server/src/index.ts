import bootstrap from './bootstrap';
import config from './config';
import contentTypes from './content-types';
import controllers from './controllers';
import destroy from './destroy';
import middlewares from './middlewares';
import policies from './policies';
import register from './register';
import routes from './routes';
import services from './services';
import type { PluginServer } from './types';

/**
 * Server half of @sirv/strapi-plugin. Strapi loads this via the `./strapi-server` export.
 */
const plugin: PluginServer = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
  middlewares,
};

export default plugin;
