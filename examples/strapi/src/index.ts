/** Actions granted to the public role so the Next.js example can read entries without a token. */
const PUBLIC_READ_ACTIONS = [
  'api::showcase.showcase.find',
  'api::showcase.showcase.findOne',
  'api::article.article.find',
  'api::article.article.findOne',
];

export default {
  register(/* { strapi } */) {},

  /**
   * Grant the public role read access to the demo content types so `examples/next` can fetch them
   * over the REST API out of the box. Demo convenience only - do not do this blindly in production.
   */
  async bootstrap({ strapi }: { strapi: any }) {
    const publicRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });
    if (!publicRole) return;

    for (const action of PUBLIC_READ_ACTIONS) {
      const existing = await strapi
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action, role: publicRole.id } });
      if (!existing) {
        await strapi
          .query('plugin::users-permissions.permission')
          .create({ data: { action, role: publicRole.id } });
      }
    }
  },
};
