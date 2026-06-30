/**
 * All `/sirv/*` routes are admin-only (type: 'admin'), so they mount under the admin API and
 * require an authenticated admin user. `admin::isAuthenticatedAdmin` gates every endpoint;
 * finer-grained RBAC is layered on in a later milestone.
 */
const adminAuth = { policies: ['admin::isAuthenticatedAdmin'] };

export default {
  admin: {
    type: 'admin',
    routes: [
      // Auth
      { method: 'POST', path: '/auth/login', handler: 'auth.login', config: adminAuth },
      { method: 'POST', path: '/auth/verify-otp', handler: 'auth.verifyOtp', config: adminAuth },
      { method: 'GET', path: '/auth/accounts', handler: 'auth.accounts', config: adminAuth },
      {
        method: 'POST',
        path: '/auth/select-account',
        handler: 'auth.selectAccount',
        config: adminAuth,
      },
      {
        method: 'POST',
        path: '/auth/connect-credentials',
        handler: 'auth.connectWithCredentials',
        config: adminAuth,
      },
      { method: 'POST', path: '/auth/logout', handler: 'auth.logout', config: adminAuth },

      // DAM
      { method: 'GET', path: '/dam/folder', handler: 'dam.folder', config: adminAuth },
      { method: 'GET', path: '/dam/search', handler: 'dam.search', config: adminAuth },
      { method: 'GET', path: '/dam/file', handler: 'dam.file', config: adminAuth },
      { method: 'GET', path: '/dam/thumb', handler: 'dam.thumb', config: adminAuth },

      // Settings + usage
      { method: 'GET', path: '/settings', handler: 'settings.find', config: adminAuth },
      { method: 'POST', path: '/settings', handler: 'settings.update', config: adminAuth },
      { method: 'GET', path: '/usage', handler: 'dam.usage', config: adminAuth },
    ],
  },
};
