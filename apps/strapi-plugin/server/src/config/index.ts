/**
 * Plugin config. The app bootstrap credential (used to authorize the email/password login
 * lookup, Path B) is read from the environment by default and can be overridden in the host's
 * `config/plugins.ts` under `sirv.config`. It is a server-only secret and never reaches the
 * browser. Without it, the email/password login is unavailable but the paste-REST-credentials
 * connect path still works.
 */
export default {
  default: {
    appClientId: process.env.SIRV_APP_CLIENT_ID ?? '',
    appClientSecret: process.env.SIRV_APP_CLIENT_SECRET ?? '',
  },
  validator() {},
};
