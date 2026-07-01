export default [
  'strapi::logger',
  'strapi::errors',
  {
    // Strapi's admin sets a strict Content-Security-Policy. Sirv assets are delivered from
    // *.sirv.com (or your custom domain), so the admin must be allowed to load images / video /
    // the sirv.js runtime from there, otherwise thumbnails and previews are blocked. Any host
    // app using @sirv/strapi-plugin needs this (see the plugin README).
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', 'https://*.sirv.com'],
          'media-src': ["'self'", 'data:', 'blob:', 'https://*.sirv.com'],
          'script-src': ["'self'", 'blob:', 'https://scripts.sirv.com', 'market-assets.strapi.io'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
