# Architecture

`@sirv/strapi-plugin` adds Sirv as a media source inside Strapi v5. This document is the
high-level map; see `strapi-plugin.md` (root) for the full spec.

## Monorepo layout

```
extensions/strapi/
├── packages/                 # host-agnostic, ZERO @strapi/* imports (boundary-enforced)
│   ├── url-builder/          # pure Sirv URL / srcset builders
│   ├── sirv-client/          # framework-agnostic Sirv REST client (runs server-side here)
│   └── core/                 # DAM hooks + headless components + SirvFieldValue + TokenStorage seam
├── apps/
│   └── strapi-plugin/        # the @sirv/strapi-plugin npm package (Strapi-specific glue)
│       ├── admin/src/        # admin half: register(app), custom field, pages, settings
│       └── server/src/       # server half: routes, controllers, services, register
├── examples/
│   └── strapi/               # example Strapi v5 app that loads the plugin
└── docs/
```

`@sirv/react` (published, `0.2.2`) is the frontend renderer used by consumer sites and the
forthcoming `examples/next`; it is not part of this repo's source.

## The one-way dependency rule

`apps/strapi-plugin/` depends on `packages/*`, never the reverse. `packages/*` must not import
`@strapi/*`. Enforced three ways: a Biome `noRestrictedImports` override, the
`scripts/check-package-boundaries.mjs` CLI (`pnpm boundaries`), and
`tests/package-boundaries.test.ts` (runs in `pnpm test`).

## Runtime topology

```
Strapi admin (browser)                 Strapi server (Koa)              Sirv
─────────────────────                  ───────────────────             ────
custom field sirv-media  ──POST /sirv/* ──>  controllers/auth|dam|settings
DAM page (sidebar)                            services/sirv-client  ──>  Sirv REST API
settings page                                 plugin store (encrypted tokens)
   (status only,                              register(): customFields.register
    never secrets)
```

- The browser talks only to `/sirv/*` admin routes (guarded by `admin::isAuthenticatedAdmin`).
- The server holds the encrypted Sirv tokens and proxies every Sirv API call using
  `@sirv/sirv-client`. Credentials never reach the browser (hard constraint).
- Picked assets are stored inline as a `sirv-media` custom field value (a `SirvFieldValue`
  JSON object). Frontends render them with `@sirv/react`.

## Custom field

`plugin::sirv.sirv-media`, underlying type `json`, registered on both halves:
- server `register.ts` -> `strapi.customFields.register({ name, plugin: 'sirv', type: 'json' })`
- admin `index.ts` -> `app.customFields.register({ name, pluginId: 'sirv', type: 'json', components.Input })`

## Auth flow (server-side, milestones 2-4)

email + password -> OTP (if required) -> account picker -> store encrypted tokens. Mirrors the
other Sirv plugins; differs from Sanity in that it runs on the server (Sanity has no server, so
it shelved this flow). See `docs/port-notes-from-sanity.md` and `docs/sirv-api-notes.md`.

## Server services (milestone 2)

The server half is built from small Strapi service factories, accessed via
`strapi.plugin('sirv').service(name)`:

- `encryption` - AES-256-GCM, key via HKDF-SHA256 from `APP_KEYS`. Never stores the raw key.
- `token-storage` - the `@sirv/core` TokenStorage seam, backed by the plugin store; persists the
  durable per-account REST credentials encrypted (`StoredCredentials`).
- `sirv-client` - builds an authed `@sirv/sirv-client` from the stored credentials; exposes
  `getClient`, `getStoredCredentials`, `getStatus`.
- `auth` - the connect flow: `login` (email/password, OTP detection), `accounts` /
  `selectAccount` (multi-account picker via encrypted connect sessions), `connectWithCredentials`
  (paste-REST-credentials fallback / self-hosted), `logout`.

The host-agnostic connect flow itself (mintAppToken / listUserAccounts / getRestCredentials /
validateAndGetAlias / isConnectableRole) lives in `@sirv/sirv-client` (`connect.ts`), reusable by
any server-side host. The DAM controllers normalize Sirv responses with the pure mappers from
`@sirv/core/assets` and `@sirv/core/search-query` (subpath exports that pull no React/DOM, so the
server bundle stays UI-free).

### Auth (Path A vs Path B)

- **Path B (product flow)**: email + password + OTP + account picker. Requires a plugin-owned app
  bootstrap credential (`SIRV_APP_CLIENT_ID` / `SIRV_APP_CLIENT_SECRET`, server-only). The server
  mints an app token, lists the user's accounts, fetches the chosen account's REST credentials,
  and stores them encrypted.
- **Path A / fallback**: paste a per-account REST clientId/secret directly
  (`POST /sirv/auth/connect-credentials`). Validated against the live API, then stored. This is
  the path the live verification uses with `.env.local`.

## Milestone status

- Milestone 1: scaffold (sidebar, settings stub, custom-field registration, route stubs, packages,
  example app, smoke tests).
- Milestone 2 (this change): server-side Sirv client + auth + REST proxy. `/sirv/auth/*` and
  `/sirv/dam/*` implemented; encryption + encrypted token storage; verified end-to-end against the
  live Sirv API (connect -> status -> folder/search/file/thumb/usage -> logout), all behind
  `admin::isAuthenticatedAdmin`.
- Milestones 3-9: encryption/refresh polish, admin login modal + account picker UI, the
  `sirv-media` field picker, DAM browser, settings page, examples.
