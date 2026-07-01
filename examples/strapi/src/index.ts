/** Actions granted to the public role so the Next.js example can read entries without a token. */
const PUBLIC_READ_ACTIONS = [
  'api::showcase.showcase.find',
  'api::showcase.showcase.findOne',
  'api::article.article.find',
  'api::article.article.findOne',
];

/**
 * Dev convenience: create a super-admin from env vars if none exists, so you never have to
 * re-register after a database reset. Set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD in .env.
 * No-op in any environment where those vars are unset. Never do this in production.
 */
async function seedAdmin(strapi: any) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;

  try {
    const count = await strapi.db.query('admin::user').count();
    if (count > 0) return;

    const superAdminRole = await strapi.db
      .query('admin::role')
      .findOne({ where: { code: 'strapi-super-admin' } });
    if (!superAdminRole) return;

    await strapi.service('admin::user').create({
      email,
      password,
      firstname: 'Admin',
      lastname: 'User',
      isActive: true,
      roles: [superAdminRole.id],
    });
    strapi.log.info(`[sirv-example] seeded super-admin ${email}`);
  } catch (err) {
    strapi.log.warn(`[sirv-example] admin seed skipped: ${(err as Error).message}`);
  }
}

/**
 * Demo convenience: if SIRV_CLIENT_ID + SIRV_CLIENT_SECRET are set and no account is connected,
 * connect Sirv on boot so a hosted demo comes up ready to browse. No-op otherwise.
 */
async function autoConnectSirv(strapi: any) {
  const clientId = process.env.SIRV_CLIENT_ID;
  const clientSecret = process.env.SIRV_CLIENT_SECRET;
  if (!clientId || !clientSecret) return;

  try {
    const sirv = strapi.plugin('sirv');
    const status = await sirv.service('sirv-client').getStatus();
    if (status.connected) return;
    await sirv.service('auth').connectWithCredentials({ clientId, clientSecret });
    strapi.log.info('[sirv-example] auto-connected Sirv from env');
  } catch (err) {
    strapi.log.warn(`[sirv-example] Sirv auto-connect skipped: ${(err as Error).message}`);
  }
}

/** Grant the public role read access to the demo content types (so examples/next needs no token). */
async function grantPublicRead(strapi: any) {
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
}

export default {
  register(/* { strapi } */) {},

  async bootstrap({ strapi }: { strapi: any }) {
    await seedAdmin(strapi);
    await autoConnectSirv(strapi);
    await grantPublicRead(strapi);
  },
};
