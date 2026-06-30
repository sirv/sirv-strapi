# Sirv for Strapi

[`@sirv/strapi-plugin`](apps/strapi-plugin) adds [Sirv](https://sirv.com) as a first-class media
source inside [Strapi v5](https://strapi.io). Editors browse, search, filter by type, and pick
images, videos, 360 spins and views from a connected Sirv account through an in-admin DAM modal.
Picked assets are stored as structured `SirvFieldValue` objects and rendered on the frontend with
the published [`@sirv/react`](https://www.npmjs.com/package/@sirv/react) package - the same
renderers shipped with the Sirv Sanity plugin.

This is the fourth headless-CMS plugin in the Sirv series (after Sanity, Storyblok and
Contentful) and reuses the same host-agnostic packages.

> Status: **milestone 1 (scaffold)**. The plugin loads in a fresh Strapi v5 install, shows a
> "Sirv" sidebar entry and a settings page, and registers the `sirv-media` custom field. Auth,
> DAM browsing and rendering land in later milestones - see `strapi-plugin.md` section 14.

## Monorepo layout

```
extensions/strapi/
├── packages/             # host-agnostic - ZERO @strapi/* imports (boundary-enforced)
│   ├── url-builder/       # @sirv/url-builder  - pure Sirv URL / srcset builders
│   ├── sirv-client/       # @sirv/sirv-client  - framework-agnostic Sirv REST client
│   └── core/              # @sirv/core         - DAM hooks, components, SirvFieldValue, TokenStorage seam
├── apps/
│   └── strapi-plugin/     # @sirv/strapi-plugin - the npm package (Strapi glue: admin + server)
├── examples/
│   └── strapi/            # example Strapi v5 app that loads the plugin
└── docs/                  # api notes, v5 gotchas, port notes, architecture
```

`@sirv/react` is published to npm and consumed by frontends; it is not vendored here.
`@sirv/core`, `@sirv/sirv-client` and `@sirv/url-builder` are not yet published, so their source
is vendored under `packages/` (see [docs/port-notes-from-sanity.md](docs/port-notes-from-sanity.md)).

## Requirements

- Node `>=20` (Strapi 5.49 supports `>=20 <=26`)
- pnpm `>=10`

## Develop

```bash
pnpm install          # install the workspace
pnpm check            # boundaries + lint + typecheck + test (the full gate)
pnpm --filter @sirv/strapi-plugin build   # build the plugin to dist/
```

### Run the example app

```bash
cp examples/strapi/.env.example examples/strapi/.env   # then fill in fresh secrets
pnpm --filter @sirv/strapi-plugin build                # plugin must be built first
pnpm --filter sirv-strapi-example develop              # http://localhost:1337/admin
```

The example app enables the plugin in [examples/strapi/config/plugins.ts](examples/strapi/config/plugins.ts).
After creating the first admin user you will see a **Sirv** entry in the sidebar and a **Sirv**
section under Settings.

## Architecture (one rule to remember)

`apps/strapi-plugin/` depends on `packages/*`, never the reverse, and `packages/*` must not import
`@strapi/*`. This keeps the shared packages reusable across every host. Enforced by a Biome rule, a
`pnpm boundaries` script, and a Vitest test. See [docs/architecture.md](docs/architecture.md).

Sirv credentials never reach the browser: the plugin's server half holds encrypted tokens and
proxies every Sirv call. See [docs/port-notes-from-sanity.md](docs/port-notes-from-sanity.md) for
how this differs from the (serverless) Sanity plugin.

## Docs

- [strapi-plugin.md](strapi-plugin.md) - full specification and milestones
- [docs/sirv-api-notes.md](docs/sirv-api-notes.md) - Sirv REST API reference for this plugin
- [docs/strapi-v5-gotchas.md](docs/strapi-v5-gotchas.md) - Strapi v5 plugin development notes
- [docs/port-notes-from-sanity.md](docs/port-notes-from-sanity.md) - what ports from the Sanity plugin
- [docs/architecture.md](docs/architecture.md) - architecture overview

## License

MIT
