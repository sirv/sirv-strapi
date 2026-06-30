# Example Strapi v5 app

A minimal Strapi v5 application that loads [`@sirv/strapi-plugin`](../../apps/strapi-plugin) from
the workspace. Use it to develop and smoke-test the plugin.

## Run

```bash
# from the repo root
pnpm install
pnpm --filter @sirv/strapi-plugin build        # the plugin must be built first

cp examples/strapi/.env.example examples/strapi/.env
# edit .env and set fresh random secrets for APP_KEYS, *_SALT, *_SECRET, ENCRYPTION_KEY

pnpm --filter sirv-strapi-example develop       # http://localhost:1337/admin
```

Create the first administrator, then:

- the **Sirv** entry appears in the left sidebar (a placeholder DAM page for now),
- **Settings -> Sirv -> Configuration** shows the connection status (Not connected),
- `plugin::sirv.sirv-media` is available as a custom field in the Content-Type Builder.

The plugin is enabled in [config/plugins.ts](config/plugins.ts). It is installed as a workspace
dependency (`"@sirv/strapi-plugin": "workspace:*"`).

## Notes

- Database is SQLite under `.tmp/` (gitignored).
- `.env` is gitignored; never commit real secrets.
- This app uses TypeScript config files and extends `@strapi/typescript-utils/tsconfigs/server`.
