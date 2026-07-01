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
- Milestone 2: server-side Sirv client + auth + REST proxy. `/sirv/auth/*` and `/sirv/dam/*`
  implemented; encryption + encrypted token storage; verified end-to-end against the live Sirv API
  (connect -> status -> folder/search/file/thumb/usage -> logout), all behind
  `admin::isAuthenticatedAdmin`.
- Milestone 3: encrypted token storage hardened (round-trip test through the plugin store,
  APP_KEYS-rotation safety). Transparent bearer refresh is inherent - `@sirv/sirv-client` mints
  and caches bearers from the stored clientId/secret and re-mints on 401 (Sirv has no refresh
  token); nothing bearer-shaped is persisted.
- Milestone 4 (this change): admin connect UI. `useSirvConnection` hook + a typed `sirv-api`
  client over `useFetchClient`; `ConnectPanel` with login (email/password), OTP, account picker,
  and the paste-REST-credentials fallback, plus the connected view with disconnect - all in the
  Settings page. Verified in a real browser: login-form errors surface, the connected view shows
  the account, and disconnect returns to the form.
- Milestones 5, 6, 8 (this change): the `sirv-media` field picker + DAM browser + type filters +
  dedicated DAM page. Verified end-to-end in a real browser against the live account: picking an
  image in the content editor stored a valid `SirvFieldValue` and rendered a thumbnail preview.
- Milestones 7, 9: settings polish (usage / default transformations), examples (Next.js).

### DAM browser + field picker (milestones 5/6/8)

The server DAM endpoints are a **thin authenticated proxy** returning RAW Sirv responses; the
admin does the normalization/classification/pagination client-side via the `@sirv/core` hooks
(`useFolders`, `useSearch`, `useTypeFilter`). This lets the browser logic be reused unchanged.

- `admin/src/api/proxy-client.ts` - a `SirvClient`-shaped adapter that routes every call through
  `/sirv/dam/*` instead of talking to Sirv directly (so credentials stay server-side).
- `admin/src/components/SirvDamBrowser.tsx` - the Strapi Design System DAM browser (folders,
  search, type-filter chips, thumbnail grid, preview/confirm), driven by the proxy client.
- `admin/src/components/DamBrowserModal.tsx` - wraps the browser in a Strapi `Modal`; resolves the
  delivery host, converts the picked `DamAsset` to a `SirvFieldValue`.
- `custom-fields/sirv-media/SirvMediaInput.tsx` - empty -> "Pick from Sirv"; filled -> preview
  with Change/Remove. Stores the value as JSON.
- `pages/HomePage.tsx` - the dedicated sidebar DAM page mounts the same browser, browse-only.

Stored value: the `SirvFieldValue` union (`_type: 'sirv.image' | ...`, `asset.{sirvAlias,
sirvPath, width?, height?, ...}`). This is exactly the shape `@sirv/react` consumes as
`SirvMediaLike`, so a frontend renders it directly with `<SirvMedia value={stored} />` - no
converter needed (the Sanity plugin stores a flat shape and needs `fromSanityMedia`).

### Host CSP requirement

Strapi's admin sets a strict Content-Security-Policy. Sirv assets are delivered from `*.sirv.com`
(or a custom domain), so the host app must extend `strapi::security` to allow `img-src` /
`media-src` (and `script-src` for sirv.js) from those hosts, or thumbnails/previews are blocked.
The example app does this in `examples/strapi/config/middlewares.ts`; the plugin README documents
it for consumers.

### Admin connect flow (milestone 4)

`admin/src/`:
- `api/sirv-api.ts` - typed calls to `/sirv/*` over the injected fetch client (pure, testable).
- `hooks/useSirvConnection.ts` - the state machine: phase (loading/disconnected/connected) and
  connect stage (form/otp/select). Holds the pending email/password in a ref for the OTP retry;
  never renders or persists them.
- `components/connect/` - `LoginForm`, `OtpForm`, `AccountPicker`, `CredentialsForm`, and
  `ConnectPanel` (the orchestrator), all Strapi Design System. The browser only ever exchanges
  connection status and login inputs; secrets stay server-side.
