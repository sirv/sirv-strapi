# Sirv Strapi Plugin — Project Context

## What this is

A Strapi v5 plugin (`@sirv/strapi-plugin`) that adds Sirv as a first-class media source inside Strapi — the most-used open-source headless CMS (60K+ GitHub stars). Editors browse, search, filter by type, and pick assets from a connected Sirv account through an in-admin DAM modal. Picked assets become structured values that frontends (Next.js, Nuxt, Astro, Remix) render through the same `@sirv/react` package shipped with the Sanity plugin — same `<SirvImage>` / `<SirvVideo>` / `<SirvSpin>` / `<SirvView>` components.

Supported asset types (matching all other Sirv plugins): **image, video, 360 spin, view**. Schema authors can restrict allowed types per custom field.

This is **the fourth headless-CMS plugin in the Sirv series** after Sanity, Storyblok, and Contentful. By the time this project starts, the shared `packages/core` / `packages/sirv-client` / `packages/url-builder` / `packages/react` are battle-tested across three platforms — the Strapi port should be the cheapest of the four (~1–1.5 weeks).

## Read this first

The full specification lives in `strapi-plugin.md` at the project root. Read it completely before writing any code.

## Hard constraints

1. **Single Strapi v5 plugin** distributed via npm as `@sirv/strapi-plugin`. Targets Strapi 5.x; verify exact minimum at the start.
2. **End-user authentication is email + password + OTP + account picker**, matching the Sirv Webflow / Framer / Sanity / Storyblok / Contentful plugins. **Users never see or enter client_id / client_secret.** Tokens stored encrypted in Strapi's plugin settings store, per-Strapi-instance.
3. **No external backend service required.** Strapi's own admin runs server-side code; the plugin's server portion uses stored Sirv tokens to proxy Sirv API calls. The admin (browser) only talks to `/sirv/*` plugin endpoints, never to Sirv directly.
4. **DAM browser UX matches existing Sirv plugins.** Port from `/Users/igor/Projects/Sirv/extensions/sanity/packages/core/` directly — Strapi's admin is React, the same DAM browser component renders unchanged behind a Strapi-specific `TokenStorage` adapter.
5. **Reuse the Sanity project's shared packages.** If `@sirv/core`, `@sirv/sirv-client`, `@sirv/url-builder`, and `@sirv/react` are published to npm, depend on them. If not, port the source and plan to deduplicate later. Strapi-specific code lives only in `apps/strapi-plugin/`.
6. **Asset types: image, video, spin, view.** Same `SirvFieldValue` discriminated union.
7. **Custom field type `sirv-media`** is the primary extension point. Strapi's native upload provider plugin slot is **not** the right place — that's for replacing Strapi's storage backend, which we're not doing.

## Tech stack

- **Plugin:** TypeScript, Strapi v5 Plugin SDK (`@strapi/sdk-plugin`).
- **Admin UI:** React 18 + Strapi Design System (`@strapi/design-system`, `@strapi/icons`).
- **Server:** Koa.js (Strapi's runtime) + TypeScript.
- **Validation:** Zod on every boundary.
- **Tests:** Vitest + React Testing Library (Strapi admin) + Strapi's own test helpers (server).
- **Lint/format:** Biome.
- **Monorepo:** pnpm workspaces.

## Reference material

- **Sirv REST API docs (source of truth):** `/Users/igor/www/sirv/sirv/rest-api/docs-next/`
- **Sirv Dynamic Imaging:** https://sirv.com/help/articles/dynamic-imaging/
- **Sirv Responsive Images / sirv.js:** https://sirv.com/help/articles/responsive-images-smv/
- **Strapi v5 plugin development:** https://docs.strapi.io/dev-docs/plugins-development
- **Strapi Design System:** https://design-system.strapi.io/
- **Strapi custom field types:** https://docs.strapi.io/dev-docs/custom-fields
- **Existing Sirv projects (heavy reuse):**
  - **Sanity plugin (closest analog):** `/Users/igor/Projects/Sirv/extensions/sanity/`
  - **DAM browser canonical UX:** `/Users/igor/Projects/Sirv/extensions/adobe/adobe-connector/`
  - **Login + Account Picker patterns:** `/Users/igor/Projects/Sirv/extensions/webflow/` and `/Users/igor/Projects/Sirv/extensions/framer/`

The Sanity project's `packages/core` is the closest match — its components plug into a Strapi-specific `TokenStorage` adapter and render unchanged.

## Credentials — two distinct paths

### 1. End-user authentication (the product)

Email + password + OTP + account picker in Strapi admin → tokens persisted encrypted in Strapi's plugin settings store. Users never see machine credentials.

### 2. Developer/CI credentials (for testing only)

`.env.local` at the repo root holds `SIRV_CLIENT_ID` / `SIRV_CLIENT_SECRET` for testing `packages/sirv-client` during development. **Never** committed.

## Repo layout (target)

```
extensions/strapi/
├── apps/
│   └── strapi-plugin/                  # the @sirv/strapi-plugin npm package
│       ├── admin/
│       │   ├── src/
│       │   │   ├── index.ts            # plugin entry (admin)
│       │   │   ├── pluginId.ts
│       │   │   ├── custom-fields/
│       │   │   │   └── sirv-media/
│       │   │   │       ├── index.ts
│       │   │   │       ├── SirvMediaInput.tsx
│       │   │   │       └── SirvMediaPreview.tsx
│       │   │   ├── components/
│       │   │   │   ├── SirvSettingsPage.tsx
│       │   │   │   └── adapters/
│       │   │   │       └── StrapiTokenStorage.ts
│       │   │   └── pages/
│       │   │       └── SirvDamPage.tsx  # dedicated DAM page in Strapi admin menu
│       │   └── tsconfig.json
│       ├── server/
│       │   ├── src/
│       │   │   ├── index.ts            # plugin entry (server)
│       │   │   ├── bootstrap.ts
│       │   │   ├── register.ts         # registers custom field type
│       │   │   ├── controllers/        # Koa controllers for /sirv/* proxy endpoints
│       │   │   ├── routes/
│       │   │   ├── services/
│       │   │   │   ├── sirv-client.service.ts
│       │   │   │   └── auth.service.ts
│       │   │   └── middlewares/
│       │   └── tsconfig.json
│       ├── strapi-server.ts
│       ├── strapi-admin.ts
│       └── package.json
├── packages/                           # (or pull from Sanity project via npm if published)
│   ├── core/
│   ├── sirv-client/
│   ├── url-builder/
│   └── react/
├── examples/
│   ├── strapi/                         # example Strapi v5 project with the plugin installed
│   └── next/                           # example Next.js consuming the Strapi API + @sirv/react
├── docs/
│   ├── architecture.md
│   ├── sirv-api-notes.md
│   ├── port-notes-from-sanity.md
│   └── strapi-v5-gotchas.md
├── .claude/
│   └── CLAUDE.md
├── .env.local                          # gitignored
├── .env.example
├── .gitignore
├── README.md
├── strapi-plugin.md                    # full spec
├── package.json                        # pnpm workspace root
└── pnpm-workspace.yaml
```

## What "done" means for MVP

1. `npm install @sirv/strapi-plugin` works in a Strapi v5 project; plugin shows up in `config/plugins.ts` and admin sidebar.
2. On first use, admin user authenticates inside Strapi via the Sirv login flow (email + password + OTP + account picker). Tokens persist encrypted.
3. Schema authors add a `sirv-media` custom field to any content type. Editors editing that content type see a Sirv-aware input that opens the DAM browser modal.
4. DAM browser supports folder tree, search, type filter chips (image / video / spin / view), thumbnail preview. Picking an asset stores a `SirvFieldValue`.
5. Dedicated "Sirv" page in Strapi admin sidebar shows the DAM browser + settings.
6. Example Next.js site in `examples/next/` consumes a Strapi API and renders all four asset types via `<SirvImage>` / `<SirvVideo>` / `<SirvSpin>` / `<SirvView>`.
7. `packages/core` builds and tests cleanly without any Strapi dependency.
8. `docs/port-notes-from-sanity.md` captures any divergences from the Sanity codebase.

## Things to NOT do

- Don't reinvent the DAM browser — port directly from Sanity's `packages/core`.
- Don't replace Strapi's Upload provider (that's for the storage backend, wrong layer).
- Don't put Strapi-specific code in `packages/`. The contract is one-way: `apps/strapi-plugin/` depends on `packages/`, never the reverse.
- Don't commit `.env.local` or any credentials.
- Don't ship without a frontend renderer story — `@sirv/react` is part of the deliverable.

## Where to start (first session checklist)

1. Read `strapi-plugin.md` end-to-end.
2. Read Sirv REST API docs at `/Users/igor/www/sirv/sirv/rest-api/docs-next/` — focus on user-auth, DAM browse/search, asset metadata. Write `docs/sirv-api-notes.md`.
3. Read https://sirv.com/help/articles/dynamic-imaging/ and https://sirv.com/help/articles/responsive-images-smv/.
4. Read Strapi v5 plugin development docs end-to-end. Document Strapi-specific patterns and gotchas in `docs/strapi-v5-gotchas.md`.
5. Study `/Users/igor/Projects/Sirv/extensions/sanity/` end-to-end — this is your blueprint. Write `docs/port-notes-from-sanity.md` capturing what ports unchanged, what needs Strapi-specific adaptation, and what's genuinely new.
6. Confirm whether `@sirv/core`, `@sirv/sirv-client`, `@sirv/url-builder`, and `@sirv/react` are already published to npm from Sanity. If yes, depend on them. If no, port the source and plan deduplication later.
7. Only then scaffold the plugin.
