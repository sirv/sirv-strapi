/**
 * Enable @sirv/strapi-plugin. Because it is installed as a workspace dependency whose
 * package.json declares `strapi.kind: "plugin"`, Strapi auto-discovers it; this entry makes
 * the wiring explicit (and is where you would pass plugin config later).
 */
export default {
  sirv: {
    enabled: true,
  },
};
