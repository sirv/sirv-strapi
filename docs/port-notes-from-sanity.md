# Port notes: Sanity plugin -> Strapi plugin

How the Sirv Sanity plugin (`/Users/igor/Projects/Sirv/extensions/sanity/`) maps onto the
Strapi v5 plugin in this repo. Read alongside `docs/architecture.md`, `docs/sirv-api-notes.md`
and `docs/strapi-v5-gotchas.md`.

## Source of truth

Studied end-to-end before scaffolding:

- Sanity monorepo root: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`,
  `biome.json`, `vitest.config.ts`, `scripts/check-package-boundaries.mjs`.
- `packages/core/` (host-agnostic DAM hooks + components + `TokenStorage` seam).
- `packages/sirv-client/` (framework-agnostic Sirv REST client).
- `packages/url-builder/` (pure URL/srcset builders).
- `apps/sanity-plugin/` (the Sanity glue: `src/index.ts`, `src/secrets-storage.ts`,
  asset-source, field-type, settings-tool).

## npm publication status (checked 2026-06-30)

| Package | On npm? | Decision |
|---|---|---|
| `@sirv/react` | yes (`0.2.2`) | depend on the published version (used by `examples/next`) |
| `@sirv/core` | no (404) | **port the source** into `packages/core` |
| `@sirv/sirv-client` | no (404) | **port the source** into `packages/sirv-client` |
| `@sirv/url-builder` | no (404) | **port the source** into `packages/url-builder` |

So three of the four shared packages are vendored here verbatim. When they are eventually
published from the Sanity repo, switch these to npm `dependencies` and delete the local copies
(plan deduplication later, per the spec).

## What ports UNCHANGED (zero edits to `src/`)

These were copied byte-for-byte from the Sanity repo (only the `@sirv/core` package.json
`description` was de-Sanity-fied). They contain ZERO host-specific code, which the boundary
guardrail enforces:

- **`packages/url-builder/`** - pure functions (`buildUrl`, `buildImageUrl`, `buildSrcSet`,
  `buildVideoUrl`, `buildSpinUrl`, `buildViewUrl`, `parseUrl`, `toQueryParams`). No I/O, no React.
- **`packages/sirv-client/`** - Sirv REST client: `createSirvClient`, DAM (`listFolder`,
  `searchFiles`, `getFileInfo`), account (`getAccountInfo`, `getUsage`, `accountAliasOptions`),
  asset classification (`classifyAssetType` / `classifyBrowseType`), token manager, Zod schemas
  (`StoredCredentials`, `FileEntry`, `SearchResponse`, ...).
- **`packages/core/`** - DAM hooks (`useSirvAuth`, `useFolders`, `useSearch`, `useTypeFilter`),
  headless components (`DamBrowser`, `ThumbnailGrid`, `AssetThumbnail`, `AssetPreview`,
  `SearchBar`, `TypeFilter`, `Breadcrumb`), asset mappers, the `SirvFieldValue` discriminated
  union + Zod schemas, and the `TokenStorage` interface (the portability seam).

The `SirvFieldValue` union (image | video | spin | view) is identical to Sanity's, so frontends
render Strapi-sourced and Sanity-sourced values with the same `@sirv/react` components.

## What needs Strapi-specific ADAPTATION

| Concern | Sanity | Strapi |
|---|---|---|
| Build | `tsup` per package, `definePlugin` from `sanity` | `@strapi/sdk-plugin` (`strapi-plugin build`) producing `dist/admin` + `dist/server`; admin & server entries via the package `exports` map (`./strapi-admin`, `./strapi-server`) |
| Plugin entry | one `definePlugin` returning `{ form, schema, tools }` | two halves: `admin/src/index.ts` (`register(app)`) and `server/src/index.ts` (`{ register, bootstrap, ... }`) |
| Field type | `sirvMedia` / `sirvMediaList` / `sirvAssetUrl` schema types via `defineType` | a single **custom field** `plugin::sirv.sirv-media` registered on BOTH sides (`app.customFields.register` + `strapi.customFields.register`), underlying type `json` |
| UI vocabulary | `@sanity/ui` | `@strapi/design-system` v2 + `@strapi/icons` v2 (root imports only) |
| Navigation | Studio "tool" (`sirvSettingsTool`) | `app.addMenuLink` (sidebar) + `app.createSettingSection` (settings) |
| Token storage seam | `createSanitySecretsStorage` - a `TokenStorage` backed by a dataset doc; **credentials live client-side** because Studio has no server | `StrapiTokenStorage` is only a *status* client; the **server** holds encrypted tokens and proxies every Sirv call. Secrets never reach the browser. |

### The biggest divergence: where auth runs

This is the one architectural difference worth internalizing.

- **Sanity** is a self-hosted SPA with **no server**. `packages/core`'s `useSirvAuth` therefore
  runs the whole auth in the browser: the user pastes per-account REST `clientId`/`clientSecret`
  on the settings page, picks a delivery alias, and bearer tokens are minted client-side via
  `POST /v2/token`. The email/password/OTP/account-lookup flow exists in `useSirvAuth` but is
  **intentionally disabled** (kept commented "for future hosted use").
- **Strapi** HAS a server half. The hard constraint (spec sections 4.3/4.4) is that Sirv
  credentials NEVER reach the browser. So Strapi runs the **full hosted flow** the Sanity build
  shelved: email + password + OTP + account picker, all server-side
  (`/sirv/auth/*` controllers), with tokens encrypted in the Strapi plugin store
  (AES-256-GCM, key via HKDF from `APP_KEYS`). The admin only ever learns connection STATUS.

Practical consequence: in Strapi we do **not** reuse `useSirvAuth` as-is. We reuse the visual
pieces from `packages/core` (login form, account picker, `DamBrowser`) but drive them against the
server endpoints rather than letting them hold credentials. `packages/sirv-client` runs
**server-side** in Strapi (in `services/sirv-client.ts`), not in the browser.

## What is genuinely NEW for Strapi (no Sanity analog)

- `server/` half entirely: controllers (`auth`, `dam`, `settings`), admin-type routes under
  `/sirv/*` guarded by `admin::isAuthenticatedAdmin`, services, `register.ts` custom-field
  registration, encryption service (milestone 3).
- Custom field registration on two sides + the content-type-builder `options`
  (`allowedTypes`, `transformDefaults`) - milestone 6.
- `StrapiTokenStorage` status adapter (`admin/src/components/adapters/`).
- Plugin store persistence (`strapi.store({ type: 'plugin', name: 'sirv' })`).
- The example **Strapi** app (`examples/strapi/`) replaces Sanity's example Studio.

## Tooling carried over (adapted)

- **Monorepo**: pnpm workspaces (`packages/*`, `apps/*`, `examples/*`), same as Sanity.
- **Boundary guardrail**: `scripts/check-package-boundaries.mjs` + a Biome `noRestrictedImports`
  override + `tests/package-boundaries.test.ts`. Sanity bans `sanity` / `@sanity/*` from
  `packages/`; here it bans `@strapi/*`. This is what keeps the ported packages reusable.
- **Biome** config, **TypeScript strict** base config, **Vitest** - same shape as Sanity.

## Divergence log (keep updating as milestones land)

- M1: vendored 3 packages instead of npm deps (not yet published). De-Sanity-fied the `@sirv/core`
  package description. Everything else under `packages/*/src` is unchanged from Sanity.
