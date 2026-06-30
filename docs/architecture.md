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

## Milestone status

Milestone 1 (this commit): scaffold only. Sidebar entry, settings stub, custom-field
registration, `/sirv/*` route + controller stubs, ported packages, example app, smoke tests.
Auth, DAM proxying, encryption, and the DAM browser UI land in milestones 2-9.
