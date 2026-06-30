# Strapi v5 plugin development - engineering reference

Practical reference for building `@sirv/strapi-plugin` on Strapi v5. Read this alongside the official docs; v5 has breaking changes from v4 so do NOT trust v4 tutorials or older blog posts.

## Versions this document describes

- **Latest stable Strapi 5.x at time of writing:** `5.48.1` (Strapi 5 went GA in late 2024; this doc reflects the v5 docs as of June 2026).
- **Minimum Node.js:** Strapi 5 supports only Active LTS / Maintenance LTS Node versions. As of mid-2026 the docs list **v22, v24, v26** as supported. **Node 20 is no longer listed.** Odd "current" releases (v23, v25) are not supported. Target Node 22 LTS for development and CI.
- **Design System:** `@strapi/design-system` **v2** (latest `2.2.0`). v5 admin uses this; v4 used design-system v1 with a totally different import style (see Gotchas).
- **React Router:** v5 admin uses `react-router-dom` **v6**.

### Exact URLs fetched for this document

- https://docs.strapi.io/dev-docs/plugins-development (plugin dev overview)
- https://github.com/strapi/sdk-plugin (SDK README - init/build/watch commands)
- https://docs.strapi.io/dev-docs/plugins/server-api  and  https://docs.strapi.io/cms/plugins-development/server-api (server entry shape)
- https://docs.strapi.io/dev-docs/plugins/admin-panel-api  and  https://docs.strapi.io/cms/plugins-development/admin-panel-api (admin entry shape)
- https://docs.strapi.io/dev-docs/custom-fields  and  https://docs.strapi.io/cms/features/custom-fields (custom field registration)
- https://docs.strapi.io/cms/plugins-development/admin-navigation-settings (addMenuLink / settings sections)
- https://docs.strapi.io/cms/plugins-development/server-routes (route shapes, content-api vs admin)
- https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes (and .../breaking-changes/design-system)
- https://docs.strapi.io/dev-docs/plugins/guides/store-and-access-data (plugin store)
- https://design-system.strapi.io/ (component reference)

Note: Strapi moved docs from `/dev-docs/*` to `/cms/*` paths during v5. Both resolve today, but `/cms/plugins-development/*` is the current canonical tree - prefer it.

---

## 1. Scaffolding with `@strapi/sdk-plugin`

The SDK (`@strapi/sdk-plugin`) generates and builds plugins. It wraps `@strapi/pack-up` for the build.

```bash
npx @strapi/sdk-plugin@latest init my-plugin
# or inside an existing repo / package directory:
npx @strapi/sdk-plugin@latest init .
```

The interactive prompt asks for plugin name, description, author, license, TypeScript yes/no, whether to use the editor config, Git, etc. Choose **TypeScript: yes**.

### Files produced (TypeScript plugin)

```
my-plugin/
├── admin/
│   └── src/
│       ├── index.ts            # admin entry: register() / bootstrap()
│       ├── pluginId.ts
│       ├── components/
│       ├── pages/
│       ├── translations/       # en.json etc.
│       └── utils/
├── server/
│   └── src/
│       ├── index.ts            # server entry: register/bootstrap/destroy + maps
│       ├── register.ts
│       ├── bootstrap.ts
│       ├── destroy.ts
│       ├── config/index.ts
│       ├── content-types/index.ts
│       ├── controllers/index.ts
│       ├── routes/index.ts
│       ├── services/index.ts
│       ├── policies/index.ts
│       └── middlewares/index.ts
├── strapi-admin.ts             # re-exports ./admin/src
├── strapi-server.ts            # re-exports ./server/src
├── package.json
├── tsconfig.json
├── tsconfig.server.json
└── README.md
```

`strapi-admin.ts` and `strapi-server.ts` are thin re-export shims that Strapi looks for at the package root:

```ts
// strapi-admin.ts
export { default } from './admin/src';

// strapi-server.ts
export { default } from './server/src';
```

### package.json `strapi` and `exports` fields

The `strapi` field declares plugin metadata. The `exports` field maps the two entry points to their built output. A scaffolded TS plugin looks like:

```jsonc
{
  "name": "@sirv/strapi-plugin",
  "version": "1.0.0",
  "type": "commonjs",
  "exports": {
    "./package.json": "./package.json",
    "./strapi-admin": {
      "types": "./dist/admin/src/index.d.ts",
      "source": "./admin/src/index.ts",
      "import": "./dist/admin/index.mjs",
      "require": "./dist/admin/index.js",
      "default": "./dist/admin/index.js"
    },
    "./strapi-server": {
      "types": "./dist/server/src/index.d.ts",
      "source": "./server/src/index.ts",
      "import": "./dist/server/index.mjs",
      "require": "./dist/server/index.js",
      "default": "./dist/server/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "strapi-plugin build",
    "watch": "strapi-plugin watch",
    "watch:link": "strapi-plugin watch:link",
    "verify": "strapi-plugin verify",
    "test:ts:front": "run -T tsc -p admin/tsconfig.json",
    "test:ts:back": "run -T tsc -p server/tsconfig.json"
  },
  "strapi": {
    "kind": "plugin",
    "name": "sirv-media",
    "displayName": "Sirv",
    "description": "Sirv as a media source inside Strapi."
  },
  "peerDependencies": {
    "@strapi/strapi": "^5.0.0",
    "@strapi/sdk-plugin": "^5.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "styled-components": "^6.0.0"
  }
}
```

Key points:
- `strapi.name` is the **plugin id** used everywhere (route prefix `/sirv-media`, `plugin::sirv-media.*`, `useFetchClient` paths). Keep it stable and lowercase-hyphenated.
- `@strapi/design-system`, `@strapi/icons`, React, react-router, styled-components belong in **peerDependencies** (and devDependencies) so the host app provides a single copy. Do NOT bundle them.

### Build / watch commands

| Command | What it does |
| --- | --- |
| `strapi-plugin build` | Compiles `admin/` and `server/` into `dist/` (CJS + ESM + `.d.ts`). Flags: `--minify` (default false), `--sourcemap` (default true). |
| `strapi-plugin watch` | Watch + recompile for local dev. |
| `strapi-plugin watch:link` | Watch + recompile + publish locally via **yalc** so a separate Strapi test app picks up changes. |
| `strapi-plugin verify` | Validates the build output before `npm publish`. Run in CI before release. |

The build output is the `dist/` directory; only `dist` (plus package.json) ships to npm via the `files` field.

---

## 2. Server entry (`server/src/index.ts`)

The server entry exports a function returning the plugin object. Each key maps to a folder/registry.

```ts
import register from './register';
import bootstrap from './bootstrap';
import destroy from './destroy';
import config from './config';
import contentTypes from './content-types';
import routes from './routes';
import controllers from './controllers';
import services from './services';
import policies from './policies';
import middlewares from './middlewares';

export default () => ({
  register,
  bootstrap,
  destroy,
  config,
  contentTypes,
  routes,
  controllers,
  services,
  policies,
  middlewares,
});
```

Lifecycle order:
- `register({ strapi })` - **before** DB and routing init. This is where you **register the custom field type** (`strapi.customFields.register`).
- `bootstrap({ strapi })` - **after** DB, routes, and permissions are initialized. Good place to seed default plugin-store config or register RBAC actions.
- `destroy({ strapi })` - on shutdown (cleanup).

### Controllers

```ts
// server/src/controllers/index.ts
import sirv from './sirv';
export default { sirv };

// server/src/controllers/sirv.ts
import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async browse(ctx) {
    // ctx is a Koa context
    const { folder, query, type } = ctx.request.query;
    ctx.body = await strapi
      .plugin('sirv-media')
      .service('sirvClient')
      .browse({ folder, query, type });
  },
});

export default controller;
```

### Services

```ts
// server/src/services/index.ts
import sirvClient from './sirv-client';
import auth from './auth';
export default { sirvClient, auth };

// server/src/services/sirv-client.ts
import type { Core } from '@strapi/strapi';

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  async browse(params) {
    // use stored Sirv tokens (see plugin store) to call Sirv API server-side
    return { items: [] };
  },
});

export default service;
```

Resolve services/controllers via:
```ts
strapi.plugin('sirv-media').service('sirvClient');
strapi.plugin('sirv-media').controller('sirv');
```

### Content-types, policies, middlewares

Each is a map exported from its `index.ts`. Content-types are declared at startup and are read/written through the **Document Service API** (`strapi.documents(...)`), not the old Entity Service. The Sirv plugin most likely needs **no** custom content-types - field values are stored as JSON on the host content type via the custom field.

---

## 3. Routes - content-api vs admin

The admin browser talks only to `/sirv-media/*` plugin endpoints, which should be **admin** routes (authenticated admin users), not public content-api routes.

Use the **named-router** form so you can mix admin and content-api:

```js
// server/src/routes/index.ts
import admin from './admin';
import contentApi from './content-api';

export default {
  admin,
  'content-api': contentApi,
};
```

```js
// server/src/routes/admin.ts
export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/browse',
      handler: 'sirv.browse',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/auth/login',
      handler: 'sirv.login',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
```

```js
// server/src/routes/content-api.ts (probably unused for Sirv, kept for completeness)
export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/public-thing',
      handler: 'sirv.publicThing',
      config: { policies: [] },
    },
  ],
};
```

Route facts:
- `type: 'admin'` mounts under the admin API and is reachable by the admin SPA; combine with `admin::isAuthenticatedAdmin` policy so only logged-in admins can hit it.
- `type: 'content-api'` exposes public REST (subject to the Users-and-Permissions plugin); not what the DAM browser uses.
- A bare **array** export (no `type`) is treated as admin routes.
- The route prefix is the plugin id, so the admin path is `/sirv-media/browse`.
- `config.auth = false` makes a route fully public (avoid for Sirv - tokens must stay server-side).
- `config.middlewares` and `config.policies` are arrays applied per route.

---

## 4. Admin entry (`admin/src/index.ts`)

```ts
import type { StrapiApp } from '@strapi/strapi/admin';
import { PuzzlePiece } from '@strapi/icons';
import pluginId from './pluginId';
import { PluginIcon } from './components/PluginIcon';
import * as sirvMediaField from './custom-fields/sirv-media';

export default {
  register(app: StrapiApp) {
    // 1. Register the plugin itself
    app.registerPlugin({ id: pluginId, name: 'Sirv' });

    // 2. Register the custom field type (see section 5)
    app.customFields.register(sirvMediaField.definition);

    // 3. Sidebar menu link to the dedicated DAM page
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: { id: `${pluginId}.plugin.name`, defaultMessage: 'Sirv' },
      Component: () => import('./pages/SirvDamPage'),
      permissions: [],
    });

    // 4. Settings section for connecting a Sirv account
    app.createSettingSection(
      { id: pluginId, intlLabel: { id: `${pluginId}.settings.section`, defaultMessage: 'Sirv' } },
      [
        {
          intlLabel: { id: `${pluginId}.settings.connection`, defaultMessage: 'Connection' },
          id: 'connection',
          to: `${pluginId}/connection`,
          Component: () => import('./components/SirvSettingsPage'),
          permissions: [],
        },
      ],
    );
  },

  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) =>
        import(`./translations/${locale}.json`)
          .then(({ default: data }) => ({ data, locale }))
          .catch(() => ({ data: {}, locale })),
      ),
    );
    return importedTrads;
  },

  bootstrap(_app: StrapiApp) {
    // runs after all plugins registered; inject into other plugins here if needed
  },
};
```

`register(app)` runs before bootstrapping; `bootstrap(app)` after all plugins are registered (use `app.getPlugin('content-manager').injectComponent(...)` here if you ever need to inject UI).

### addMenuLink

```ts
app.addMenuLink({
  to: `/plugins/my-plugin`,
  icon: PluginIcon,
  intlLabel: { id: 'my-plugin.plugin.name', defaultMessage: 'My Plugin' },
  Component: () => import('./pages/App'),
  permissions: [],
  position: 3,
  licenseOnly: false,
});
```

### createSettingSection / addSettingsLink

```ts
app.createSettingSection(
  { id: 'my-plugin', intlLabel: { id: 'my-plugin.settings.section-label', defaultMessage: 'My Plugin Settings' } },
  [
    {
      intlLabel: { id: 'my-plugin.settings.general', defaultMessage: 'General' },
      id: 'general',
      to: 'my-plugin/general',
      Component: () => import('./pages/Settings/General'),
    },
  ],
);

// or add a link into an existing section ('global', 'email', etc.)
app.addSettingsLink('global', {
  intlLabel: { id: 'my-plugin.settings.documentation', defaultMessage: 'Documentation' },
  id: 'documentation',
  to: 'my-plugin/documentation',
  Component: () => import('./pages/Settings/Documentation'),
  permissions: [],
});
```

`Component` is always a lazy `() => import(...)` (dynamic import). `intlLabel.id` strings must exist in `translations/*.json`.

---

## 5. Registering the `sirv-media` custom field type

A custom field is registered **twice**: once server-side (declares the underlying storage type) and once admin-side (declares the React Input + builder options).

### Server side - in `register()`

```ts
// server/src/register.ts
import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.customFields.register({
    name: 'sirv-media',
    plugin: 'sirv-media',      // must match strapi.name in package.json
    type: 'json',              // SirvFieldValue is a structured object -> store as JSON
    inputSize: { default: 12, isResizable: true },
  });
};
```

`type` is the underlying Strapi data type. Custom fields **cannot** use `relation`, `media`, or `component` as the underlying type. For a structured discriminated-union `SirvFieldValue` (image | video | spin | view), use `type: 'json'`. (If you only ever stored a single asset URL/id string you could use `'string'`, but `'json'` is correct for the union.)

### Admin side - `app.customFields.register()`

```tsx
// admin/src/custom-fields/sirv-media/index.ts
import { SirvIcon } from '../../components/SirvIcon';

export const definition = {
  name: 'sirv-media',
  pluginId: 'sirv-media',
  type: 'json',
  icon: SirvIcon,
  intlLabel: { id: 'sirv-media.label', defaultMessage: 'Sirv media' },
  intlDescription: { id: 'sirv-media.description', defaultMessage: 'Pick an asset from Sirv' },
  components: {
    Input: async () =>
      import('./SirvMediaInput').then((m) => ({ default: m.SirvMediaInput })),
  },
  options: {
    base: [
      {
        sectionTitle: { id: 'sirv-media.options.types', defaultMessage: 'Allowed types' },
        items: [
          {
            intlLabel: { id: 'sirv-media.options.allowImages', defaultMessage: 'Allow images' },
            name: 'options.allowImages',
            type: 'checkbox',
            value: true,
          },
          // ...allowVideos / allowSpins / allowViews
        ],
      },
    ],
    advanced: [],
    // optional: validator: (args) => ({ ... yup schema ... }),
  },
};
```

`components.Input` must be a lazy import (`async () => import(...).then(...)`). The builder `options` (base/advanced/validator) drive the content-type builder UI; values land on `attribute.options` and are readable in the Input via `props.attribute`.

### Input component props and the controlled-input rule

The Input is rendered by the Content Manager and receives:

| Prop | Notes |
| --- | --- |
| `value` | current field value (your serialized `SirvFieldValue` JSON string / object) |
| `onChange` | call `onChange({ target: { name, type: attribute.type, value } })` |
| `name` | field name |
| `attribute` | `{ type, customField, options }` - read your builder options here |
| `type` | the custom-field UID, e.g. `plugin::sirv-media.sirv-media` |
| `intlLabel`, `description`, `placeholder`, `hint` | IntlObjects |
| `required`, `disabled`, `error` | validation/state |
| `contentTypeUID` | parent content type |

```tsx
// admin/src/custom-fields/sirv-media/SirvMediaInput.tsx
import * as React from 'react';
import { Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

export const SirvMediaInput = React.forwardRef((props: any, ref) => {
  const { attribute, name, onChange, value, intlLabel, required, error, disabled } = props;
  const { formatMessage } = useIntl();

  // value comes in as a JSON string for type:'json'; parse defensively
  const parsed = React.useMemo(() => {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  }, [value]);

  const setAsset = (asset: unknown) => {
    onChange({
      target: { name, type: attribute.type, value: JSON.stringify(asset) },
    });
  };

  return (
    <Field.Root name={name} id={name} error={error} required={required}>
      <Field.Label>{formatMessage(intlLabel)}</Field.Label>
      {/* open DAM modal, render preview, call setAsset(...) on pick */}
      <Field.Error />
      <Field.Hint />
    </Field.Root>
  );
});
```

**Critical:** the input MUST be controlled and must call `onChange` with the `{ target: { name, type, value } }` shape, or the value will not be saved. For `type: 'json'`, Strapi typically passes/expects a JSON **string** - serialize on write and parse on read (handle both string and object defensively).

---

## 6. Calling server routes from the admin (`useFetchClient` / `getFetchClient`)

Use Strapi's fetch client so requests are authenticated against the admin session automatically. Do NOT use raw `fetch` or hit Sirv directly from the browser.

```tsx
import { useFetchClient } from '@strapi/strapi/admin';

function useSirv() {
  const { get, post } = useFetchClient();

  const browse = (params) => get('/sirv-media/browse', { params });
  const login = (creds) => post('/sirv-media/auth/login', creds);

  return { browse, login };
}
```

Outside React (utils, thunks) use `getFetchClient()` from the same module. The base URL is the admin API; the path is `/<plugin-id>/<route-path>`. The client attaches the admin JWT and returns an axios-style `{ data }` response.

Import path in v5 is `@strapi/strapi/admin` (the old v4 `@strapi/helper-plugin` is removed - see Gotchas).

---

## 7. Persisting data with the plugin store

Store the encrypted Sirv tokens / account selection in the plugin store (server-side only).

```ts
function getPluginStore(strapi) {
  return strapi.store({ type: 'plugin', name: 'sirv-media' });
}

// write
await getPluginStore(strapi).set({ key: 'settings', value: { account, tokensEncrypted } });

// read
const settings = await getPluginStore(strapi).get({ key: 'settings' });

// delete
await getPluginStore(strapi).delete({ key: 'settings' });
```

`strapi.store({ type: 'plugin', name: '...' })` returns an object with async `get`, `set`, `delete`, each taking `{ key }` (and `set` taking `{ key, value }`). Data is namespaced per plugin and persisted in the `strapi-core-store-settings` DB table, so it is per-Strapi-instance. **Encrypt secrets yourself before storing** (e.g. AES-GCM with a key derived from `process.env`); the store does not encrypt.

A common pattern is to seed defaults in `bootstrap()`:

```ts
export default async ({ strapi }) => {
  const store = strapi.store({ type: 'plugin', name: 'sirv-media' });
  const existing = await store.get({ key: 'settings' });
  if (!existing) {
    await store.set({ key: 'settings', value: { connected: false } });
  }
};
```

---

## 8. Permissions and policies for admin routes

- Protect every `/sirv-media/*` admin route with the built-in policy `admin::isAuthenticatedAdmin` so only logged-in admin users can reach the Sirv proxy endpoints.
- For finer-grained RBAC, register plugin actions in `bootstrap()` and reference them via the route's `config.auth.scope` or a custom policy:

```ts
// server/src/bootstrap.ts
export default async ({ strapi }) => {
  await strapi.admin.services.permission.actionProvider.registerMany([
    {
      section: 'plugins',
      displayName: 'Browse Sirv assets',
      uid: 'browse',
      pluginName: 'sirv-media',
    },
  ]);
};
```

Then a route can require it:

```js
{
  method: 'GET',
  path: '/browse',
  handler: 'sirv.browse',
  config: {
    policies: [
      'admin::isAuthenticatedAdmin',
      { name: 'admin::hasPermissions', config: { actions: ['plugin::sirv-media.browse'] } },
    ],
  },
}
```

For MVP, `admin::isAuthenticatedAdmin` alone is sufficient; add RBAC actions later if editors need scoped access.

---

## 9. TypeScript and the build pipeline

- v5 plugins are first-class TypeScript. The SDK scaffolds `tsconfig.json` (admin) and `tsconfig.server.json` (server). Type-check both: `tsc -p admin/tsconfig.json` and `tsc -p server/tsconfig.json` (the scaffold wires these as `test:ts:front` / `test:ts:back`).
- Core types: `import type { Core } from '@strapi/strapi'` (e.g. `Core.Strapi`) on the server; `import type { StrapiApp } from '@strapi/strapi/admin'` on the admin.
- `strapi-plugin build` (pack-up under the hood) emits `dist/admin/*` and `dist/server/*` in CJS + ESM with `.d.ts`, matching the `exports` map.
- Only `dist/` is published (`files: ["dist"]`).

---

## 10. Installing the plugin locally for development

Two supported workflows:

### a) `watch:link` + yalc (recommended for an external test app)

In the plugin package:
```bash
npm run watch:link    # builds, watches, publishes to local yalc store
```
The terminal prints a `yalc add @sirv/strapi-plugin` (or `npx yalc link ...`) command to run **inside your test Strapi app**. After linking, enable it in the app config:

```ts
// config/plugins.ts in the test Strapi app
export default {
  'sirv-media': {
    enabled: true,
  },
};
```

### b) Local path resolve (monorepo)

If the example Strapi app lives in the same pnpm workspace (`examples/strapi/`), you can point the host app at the package via a workspace dependency, or resolve the source directly:

```ts
// examples/strapi/config/plugins.ts
import path from 'path';

export default ({ env }) => ({
  'sirv-media': {
    enabled: true,
    resolve: path.resolve(__dirname, '../../apps/strapi-plugin'),
  },
});
```

Either way, restart the Strapi dev server (`npm run develop`) after the first link; the admin must rebuild to pick up a new plugin. Plugin id in `config/plugins.ts` must match `strapi.name` in package.json (`sirv-media`).

---

## 11. v4 to v5 breaking changes that affect plugins

| Area | v4 | v5 | Impact |
| --- | --- | --- | --- |
| Data API | Entity Service (`strapi.entityService`) | **Document Service** (`strapi.documents(uid)`) | Rewrite any server data access. Codemod is partial. |
| Identifiers | numeric `id` | **`documentId`** (string) is the public id; drafts/published share a documentId | API params and lookups change. |
| REST response shape | nested `data.attributes` wrapper | **flattened** response (fields on the object directly, no `attributes`) | Admin/data-handling code must stop unwrapping `attributes`. No codemod. |
| Admin helpers | `@strapi/helper-plugin` | **removed**; helpers moved into `@strapi/strapi/admin` (`useFetchClient`, `useNotification`, etc.) | Change every import. No drop-in codemod. |
| Design System | `@strapi/design-system` v1 (subpath imports) | **v2** (root imports, renamed/removed components) | See below. No codemod. |
| Routing | react-router-dom v5 | **v6** | Route/Link APIs differ; codemod assists. |
| Layout components | from design-system | moved to `@strapi/admin/strapi-admin`; `EditViewLayout`/`ListViewLayout` refactored | Import paths change. |

Design System v2 specifics for plugins:
- Import from the root: `import { Combobox, Field } from '@strapi/design-system'` - **not** `@strapi/design-system/Combobox`.
- Removed: `Icon`, `Stack`, `ToggleCheckbox`, and `Select`/`Option`/`OptGroup`/`SelectList` (use `SingleSelect`/`MultiSelect`).
- Renamed: `ToggleInput` -> `Toggle`.
- Form fields use the compound `Field.Root` / `Field.Label` / `Field.Error` / `Field.Hint` pattern.
- Polymorphic `as` prop -> `tag`.
- Provider: `ThemeProvider` -> `DesignSystemProvider`.
- Base font-size is `62.5%` (1rem = 10px) - watch any hardcoded rem math.

---

## Gotchas (top traps)

1. **Do not trust v4 docs/tutorials/blog posts.** Most "build a Strapi plugin" content online is v4. Entity Service, `@strapi/helper-plugin`, design-system v1 subpath imports, and the `data.attributes` response wrapper are all v4-only and will break or mislead you.
2. **`@strapi/helper-plugin` is gone.** Get `useFetchClient`, `getFetchClient`, `useNotification`, `useRBAC`, layout components, etc. from `@strapi/strapi/admin`. Any tutorial importing from `@strapi/helper-plugin` is v4.
3. **Design System v2 import style.** Root imports only; several components were removed/renamed (`Stack`, `ToggleInput`, `Select`, `Icon`). Check the live reference at https://design-system.strapi.io/ for the exact current component API before using it.
4. **Custom field underlying `type` cannot be relation/media/component.** Use `json` for the `SirvFieldValue` union. Note that `type:'json'` values arrive in the Input as a JSON **string** - serialize on write, parse defensively on read.
5. **Controlled input or the value silently does not save.** Always call `onChange({ target: { name, type: attribute.type, value } })`; never leave the input uncontrolled.
6. **Plugin id must match everywhere.** `strapi.name` in package.json == the key in the app's `config/plugins.ts` == the route prefix == `plugin::<id>.*` permission namespace == `pluginId`. A mismatch makes routes 404 and the field invisible.
7. **The plugin store does not encrypt.** Encrypt Sirv tokens yourself before `store.set`. Never store raw secrets, and never send `client_id`/`client_secret` to the browser.
8. **Keep Sirv calls server-side.** The admin only calls `/sirv-media/*` admin routes guarded by `admin::isAuthenticatedAdmin`; the server holds tokens and proxies to Sirv. Do not call Sirv from React.
9. **Node version drift.** Strapi 5 dropped older Node lines; develop and run CI on Node 22 LTS (24/26 also supported). Node 20 is no longer listed as supported.
10. **`Component` references in addMenuLink/settings/customFields must be lazy** (`() => import(...)`), and every `intlLabel.id` must exist in `translations/*.json` or the UI shows raw ids.
11. **Admin changes need an admin rebuild.** After first linking the plugin, restart `develop`; the admin bundle must rebuild to register the menu link, settings section, and custom field.
12. **Two docs trees exist** (`/dev-docs/*` legacy redirects and `/cms/*` current). Prefer `/cms/plugins-development/*`; some legacy URLs 404.

---

## Unverified / check during implementation

- **Exact `dist` `exports` map and CJS/ESM filenames** vary slightly by SDK version - run `init` once and copy the generated `package.json` rather than hand-writing the `exports` block above.
- **`type: 'json'` value encoding in the custom-field Input** (string vs already-parsed object) - confirm empirically in a running app; handle both. The Sanity port's serialization may differ from what Strapi's Content Manager hands back.
- **RBAC action registration API** (`strapi.admin.services.permission.actionProvider.registerMany`) - signature/availability should be confirmed against 5.48.x; for MVP `admin::isAuthenticatedAdmin` is enough and avoids this.
- **Plugin store signature** (`{ environment, type, name }` vs `{ type, name }`) - v4 examples include `environment: ''`; v5 examples omit it. Confirm whether `environment` is still accepted/needed.
- **`registerTrads` exact return shape** and whether `Promise.allSettled` is needed for missing locales - verify against the scaffolded admin entry.
- **Minimum Strapi 5.x version to pin in `peerDependencies`** - `^5.0.0` is safe, but if you rely on a recently added admin export, bump the floor accordingly. Verify the lowest 5.x you actually test against.
- **`@strapi/strapi/admin` vs `@strapi/admin/strapi-admin` import paths** - both appear in docs for different exports (hooks vs layout components). Confirm the correct path per symbol when you wire them.
