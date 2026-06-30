# Sirv Strapi Plugin — Full Project Specification

## 1. Goal

Ship `@sirv/strapi-plugin`, a Strapi v5 plugin that adds Sirv as a first-class media source inside Strapi — the most-used open-source headless CMS (60K+ GitHub stars). Editors browse, search, filter by type, and pick assets from a connected Sirv account through an in-admin DAM modal. Picked assets become structured field values containing a type discriminator (image / video / spin / view), Sirv URL, dimensions, format, and any applied transformations.

Frontends (Next.js, Nuxt, Astro, Remix) render those stored values using the same `@sirv/react` package shipped with the Sanity plugin — `<SirvImage>`, `<SirvVideo>`, `<SirvSpin>`, `<SirvView>`, `<SirvMedia>`.

This is the **fourth headless-CMS plugin** in the Sirv series after Sanity, Storyblok, and Contentful. Architecture must reuse the shared packages established by those projects. Strapi-specific code lives only in `apps/strapi-plugin/`.

## 2. Background

By the time this project starts:

- `packages/core` (DAM browser + Login + Account Picker + TokenStorage interface) is battle-tested across three platforms.
- `packages/sirv-client` (framework-agnostic Sirv REST client) is published.
- `packages/url-builder` is published.
- `packages/react` (frontend renderers) is published.

Strapi is the cheapest port of the four because:

- Same React + TypeScript stack as Sanity and Contentful.
- Strapi's admin runs natively (no iframe sandbox, unlike Contentful), so `packages/core` components mount directly.
- No marketplace review for npm distribution (Strapi has a marketplace for visibility, but listing is optional).
- Dev-heavy audience tolerates v0 quickly and provides quality feedback.

Estimated effort: ~1 to 1.5 weeks once `packages/core` is stable.

## 3. Reference Material

- **Sirv REST API docs (source of truth):** `/Users/igor/www/sirv/sirv/rest-api/docs-next/`
  - Focus: user-auth endpoints, DAM browse/search with type filter, asset metadata, URL signing.
  - Write `docs/sirv-api-notes.md` as you read.
- **Sirv Dynamic Imaging:** https://sirv.com/help/articles/dynamic-imaging/
- **Sirv Responsive Images + sirv.js:** https://sirv.com/help/articles/responsive-images-smv/
- **Strapi v5 plugin development:** https://docs.strapi.io/dev-docs/plugins-development
- **Strapi Design System:** https://design-system.strapi.io/
- **Strapi custom field types:** https://docs.strapi.io/dev-docs/custom-fields
- **Strapi plugin SDK (`@strapi/sdk-plugin`):** https://github.com/strapi/sdk-plugin

### Existing Sirv projects (heavy reuse)

- **Sanity plugin (the closest analog — your blueprint):** `/Users/igor/Projects/Sirv/extensions/sanity/`
  - `packages/core/` ports unchanged behind a Strapi `TokenStorage` adapter.
  - `packages/sirv-client/`, `packages/url-builder/`, `packages/react/` — depend on the published npm versions.
- **DAM browser canonical UX:** `/Users/igor/Projects/Sirv/extensions/adobe/adobe-connector/`
- **Login + Account Picker patterns:** `/Users/igor/Projects/Sirv/extensions/webflow/`, `/Users/igor/Projects/Sirv/extensions/framer/`

Before writing code, study the Sanity project and write `docs/port-notes-from-sanity.md` cataloging what ports unchanged, what needs Strapi-specific adaptation, and what's new for Strapi.

## 4. Hard Constraints

1. **Single Strapi v5 plugin** distributed via npm as `@sirv/strapi-plugin`. Targets the latest stable Strapi 5.x (verify exact minimum at the start).
2. **End-user auth is email + password + OTP + account picker**, matching the other Sirv plugins. **Users never see client_id/secret.**
3. **No external backend service.** Strapi server-side code (in the plugin's `server/` folder) proxies all Sirv API calls. Browser only talks to `/sirv/*` plugin endpoints.
4. **Sirv credentials never reach the browser.** Tokens stored encrypted in Strapi's plugin settings store.
5. **Custom field type `sirv-media` is the primary extension point.** The Strapi Upload provider plugin slot is not used — that's for replacing storage backend, which is not the goal here.
6. **DAM browser UX matches existing Sirv plugins.** Port from Sanity's `packages/core`; don't redesign.
7. **`packages/core` must contain ZERO Strapi-specific code.** Strapi-specific code lives only in `apps/strapi-plugin/`. Enforce with a Biome rule banning `@strapi/*` imports from `packages/`.

## 5. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Strapi admin (the editor's environment, /admin)                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  @sirv/strapi-plugin (admin half)                            ││
│  │  • Custom field type: sirv-media                              ││
│  │     - SirvMediaInput (renders in content editor)              ││
│  │     - SirvMediaPreview                                        ││
│  │  • Sirv DAM page in admin sidebar                             ││
│  │  • Settings page (connection / login)                         ││
│  │  • Strapi-specific TokenStorage adapter                       ││
│  │  • Strapi Design System wrappers around packages/core         ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  /admin → POST /sirv/* (Strapi REST plugin routes)
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  @sirv/strapi-plugin (server half)                                │
│  • Controllers / routes for /sirv/auth/* and /sirv/dam/*          │
│  • Services using @sirv/sirv-client                               │
│  • TokenStorage backed by Strapi plugin settings store            │
│  • Permission policy (admin-role-aware)                           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                        Sirv REST API
                              │
                              ▼
               Sirv account (DAM, transformations, sirv.js)

┌──────────────────────────────────────────────────────────────────┐
│  Frontend site (Next.js, Nuxt, Astro, Remix, etc.)                │
│  • Fetches content from Strapi via REST or GraphQL                │
│  • Renders SirvFieldValue using @sirv/react                       │
│  • <SirvImage>, <SirvVideo>, <SirvSpin>, <SirvView>, <SirvMedia> │
└──────────────────────────────────────────────────────────────────┘
```

## 6. Capabilities

### 6.1 Custom field type `sirv-media`

Schema authors add it like any Strapi field:

```ts
// content-types/article/schema.json
{
  "attributes": {
    "hero": {
      "type": "customField",
      "customField": "plugin::sirv.sirv-media",
      "options": {
        "allowedTypes": ["image", "video"],
        "transformDefaults": { "quality": 85, "format": "optimal" }
      }
    }
  }
}
```

Editor experience:

1. Editor opens the content type's edit view.
2. The `hero` field renders a `SirvMediaInput` (Strapi Design System styled).
3. Empty → "Pick from Sirv" button.
4. Filled → preview of the asset (thumbnail for image, poster + play icon for video, etc.) with Edit / Remove actions.
5. Clicking Pick from Sirv opens the DAM browser modal (from `packages/core`) wrapped in a Strapi Design System modal shell.
6. Type filter chips reflect `allowedTypes` (hidden if only one type is allowed).
7. After selection, optional transformations are configurable inline (focal point for images, autoplay/loop for videos, spin options for spins).

The stored field value uses the same `SirvFieldValue` discriminated union as Sanity.

### 6.2 Sirv DAM page (admin sidebar)

A dedicated "Sirv" entry in the Strapi admin sidebar opens a full-page DAM browser. Useful for:

- Browsing the connected Sirv account without picking anything.
- Bulk tagging or metadata edits (fast-follow).
- Viewing account usage (storage, bandwidth).
- Switching accounts or reconnecting.

Implementation: the same `<DamBrowser>` component from `packages/core`, mounted in a full-page layout.

### 6.3 Settings page

Strapi plugins can expose settings under `/admin/settings`. The Sirv settings page provides:

- Current connection status (connected account alias + user email).
- Login / reconnect / sign out.
- Default transformations (applied to all picked assets unless overridden per-field).
- Sirv usage summary (bandwidth, storage, transformations).

### 6.4 Server-side response transformations (FAST-FOLLOW, optional in MVP)

Hook into Strapi's response lifecycle to enrich `SirvFieldValue` outputs with a default-transformed URL alongside the structured value. This makes consumption from frontends that don't use `@sirv/react` cleaner. Document the design but don't ship until validated.

## 7. Authentication

Identical to the Sanity plugin's flow:

```
Editor opens Sirv settings (or any sirv-media field for the first time)
  ↓
Plugin checks Strapi's plugin settings store for stored Sirv tokens
  ↓
None found → Login modal (from packages/core)
  ↓
Email + password → POST /sirv/auth/login
  ↓
(If MFA) OTP → POST /sirv/auth/verify-otp
  ↓
Server calls Sirv user-auth endpoints, receives access + refresh tokens
  ↓
Server lists accounts available to the authenticated user
  ↓
Account Picker (from packages/core) → editor selects → POST /sirv/auth/select-account
  ↓
Server stores { accessToken, refreshToken, accountAlias, accountId, expiresAt }
  encrypted in Strapi's plugin settings store
  ↓
Subsequent admin sessions: tokens read server-side, refreshed transparently
```

**Encryption:** use Node's `crypto` with AES-256-GCM, key derived from `process.env.APP_KEYS` (Strapi's app key) via HKDF.

**Token storage** lives in Strapi's plugin settings (`strapi.store({ type: 'plugin', name: 'sirv' })`).

## 8. Asset Types

Same as all other Sirv plugins:

| Type | Renderer | Notes |
|---|---|---|
| `image` | `<SirvImage>` | Responsive srcset, native or sirv.js lazy. |
| `video` | `<SirvVideo>` | HTML5 video with Sirv URL. |
| `spin` | `<SirvSpin>` | Loads sirv.js. |
| `view` | `<SirvView>` | Loads sirv.js. |
| any | `<SirvMedia>` | Polymorphic dispatcher. |

Stored value: same `SirvFieldValue` discriminated union from `packages/core`.

## 9. REST API Endpoints (plugin server routes)

All under the Strapi plugin namespace (`/sirv/*`). Plugin-level authentication via Strapi's admin policy.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/sirv/auth/login` | Email + password → tokens or `requiresOtp` |
| `POST` | `/sirv/auth/verify-otp` | OTP verification |
| `GET`  | `/sirv/auth/accounts` | List accounts for authenticated user |
| `POST` | `/sirv/auth/select-account` | Pick account, persist tokens |
| `POST` | `/sirv/auth/logout` | Clear tokens |
| `GET`  | `/sirv/dam/folder` | List folder (paginated, type-filterable) |
| `GET`  | `/sirv/dam/search` | Search by name/tag/type |
| `GET`  | `/sirv/dam/file` | Get file info |
| `GET`  | `/sirv/dam/thumb` | Signed thumb URL |
| `GET`  | `/sirv/settings` | Get settings |
| `POST` | `/sirv/settings` | Update settings |
| `GET`  | `/sirv/usage` | Account usage summary |

Permission policy: only admin users with read access to media-bearing content types can call DAM endpoints. Settings endpoints require super-admin or plugin-config permission.

## 10. Repo Layout

```
extensions/strapi/
├── apps/
│   └── strapi-plugin/                  # @sirv/strapi-plugin
│       ├── admin/
│       │   ├── src/
│       │   │   ├── index.ts            # admin entry (registers field type, sidebar link)
│       │   │   ├── pluginId.ts
│       │   │   ├── custom-fields/
│       │   │   │   └── sirv-media/
│       │   │   │       ├── index.ts
│       │   │   │       ├── SirvMediaInput.tsx     # field input wrapper
│       │   │   │       └── SirvMediaPreview.tsx
│       │   │   ├── components/
│       │   │   │   ├── SirvSettingsPage.tsx
│       │   │   │   ├── SirvDamPage.tsx
│       │   │   │   └── adapters/
│       │   │   │       └── StrapiTokenStorage.ts  # implements TokenStorage from packages/core
│       │   │   └── pages/
│       │   └── tsconfig.json
│       ├── server/
│       │   ├── src/
│       │   │   ├── index.ts            # server entry
│       │   │   ├── bootstrap.ts
│       │   │   ├── register.ts         # registers custom field type with Strapi
│       │   │   ├── controllers/
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── dam.controller.ts
│       │   │   │   └── settings.controller.ts
│       │   │   ├── routes/
│       │   │   ├── services/
│       │   │   │   ├── sirv-client.service.ts     # wraps @sirv/sirv-client
│       │   │   │   ├── auth.service.ts
│       │   │   │   └── encryption.service.ts
│       │   │   ├── middlewares/
│       │   │   └── policies/
│       │   └── tsconfig.json
│       ├── strapi-server.ts
│       ├── strapi-admin.ts
│       └── package.json
├── packages/                           # depend on Sanity-published versions if available
│   ├── core/                           # else port
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
├── strapi-plugin.md                    # this file
├── package.json                        # pnpm workspace root
└── pnpm-workspace.yaml
```

## 11. Deliverables

1. `@sirv/strapi-plugin` published to npm.
2. (Optional) Listed on Strapi marketplace.
3. `examples/strapi/` and `examples/next/` working end-to-end against the live Sirv test account.
4. `README.md` with install + 5-minute getting-started.
5. `docs/port-notes-from-sanity.md` documenting the port path concretely (any divergences from the Sanity codebase).
6. 90-second demo video: install plugin → connect Sirv → schema author adds `sirv-media` field → editor picks → Next.js example renders all asset types.
7. Blog post draft for sirv.com.
8. Landing page section at sirv.com/integrations/strapi.

## 12. Success Criteria

- **Time from `npm install` to first Sirv asset rendered in Strapi admin:** < 5 minutes.
- **DAM browser parity:** identical to Sanity / Webflow / Framer.
- **Strapi marketplace listing approved on first submission.**
- **`packages/core` reused unchanged from Sanity** (proves the cross-platform abstraction works for a fourth host).
- **End-to-end TypeScript** with autocomplete across schema → admin → frontend.
- **No external backend required.**

## 13. Non-Goals (MVP)

- Replacing Strapi's Upload provider (different layer, not the goal).
- Sirv as a Strapi upload provider for direct asset upload from Strapi to Sirv — fast-follow if validated demand.
- AI Studio integration (background removal, etc.) — fast-follow.
- Multi-account support in a single Strapi instance.
- Sanity / Storyblok / Contentful interop tooling.

## 14. Implementation Order (milestones)

Stop and check in after each.

1. **Plugin scaffold via `@strapi/sdk-plugin init`.** Plugin loads in a fresh Strapi v5 project; admin sidebar shows the "Sirv" entry; settings page renders a stub; smoke tests pass.
2. **Server side: Sirv client + auth + REST proxy.** Use `@sirv/sirv-client` (npm or ported). Implement `/sirv/auth/*` and `/sirv/dam/*`. Tested against the live API using credentials in `.env.local`.
3. **Strapi `TokenStorage` adapter + encryption service.** Tokens persist encrypted in Strapi plugin settings store. Refresh works transparently.
4. **Admin: Login modal + Account Picker.** Reuse from `packages/core`. Wire to the server's auth endpoints. End-to-end login works.
5. **Custom field type `sirv-media`.** Registered via `strapi.customFields.register()`. `SirvMediaInput` opens the DAM browser modal. Picking an asset stores `SirvFieldValue`.
6. **DAM browser polish + type filters + transformation editor.** Per-asset focal point, quality, format controls inline.
7. **Settings page polish.** Connection status, switch account, sign out, usage summary, default transformations.
8. **Dedicated Sirv DAM page in admin sidebar.** Full-page DAM browser.
9. **Examples: `examples/strapi/` + `examples/next/`.** End-to-end demo with all asset types.
10. **Marketplace submission, README, blog post, landing page.**

## 15. Notes for the Implementer

- **The Sanity project is the blueprint.** Spend the first session reading it end-to-end and writing `docs/port-notes-from-sanity.md`. The closer this plugin's architecture mirrors Sanity's, the less integration drift later.
- **Strapi v5 has breaking changes from v4.** Don't trust v4 documentation or older community plugins as references — Strapi v5 plugin SDK is different. Verify everything against the official v5 docs.
- **Strapi's Design System** is the canonical UI vocabulary in the admin. Wrap `packages/core` components in Strapi Design System components rather than re-skinning them. This keeps consistency with the rest of the admin.
- **The Strapi marketplace** has guidelines for plugin metadata (name conventions, screenshots, description format). Read those before publishing — saves a rejection round.
- **Encryption key management:** Strapi's `APP_KEYS` env var is the natural root. Derive a plugin-specific key via HKDF; never reuse the raw APP_KEYS.
- **Test against the live Sirv API from day 1** using `.env.local` credentials.
- **`@sirv/react` is part of the deliverable.** Even though it's shipped from Sanity, the Strapi project's README must show users how to install and use it. The Next.js example is the canonical reference.
