# @sirv/strapi-plugin

Add [Sirv](https://sirv.com) as a media source inside [Strapi v5](https://strapi.io): connect your
account, browse the Sirv DAM, and pick images, videos, 360 spins or views. Assets stay on Sirv and
render on the frontend with [`@sirv/react`](https://www.npmjs.com/package/@sirv/react).

> Status: milestone 1 (scaffold). See the repo root `strapi-plugin.md` for the roadmap.

## Install

```bash
npm install @sirv/strapi-plugin
```

Enable it in `config/plugins.ts`:

```ts
export default {
  sirv: { enabled: true },
};
```

Restart Strapi. You will see a **Sirv** entry in the admin sidebar and a **Sirv** section under
Settings.

### Allow Sirv assets in your Content-Security-Policy

Strapi's admin sets a strict CSP that blocks external images. Sirv delivers assets from
`*.sirv.com` (or your custom domain), so extend `strapi::security` in `config/middlewares.ts`,
otherwise DAM thumbnails and previews are blocked:

```ts
export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', 'https://*.sirv.com'],
          'media-src': ["'self'", 'data:', 'blob:', 'https://*.sirv.com'],
          'script-src': ["'self'", 'blob:', 'https://scripts.sirv.com', 'market-assets.strapi.io'],
        },
      },
    },
  },
  // ...the rest of the default middleware stack
];
```

Use your custom delivery domain instead of `*.sirv.com` if you have one.

## Use the custom field

Add the `sirv-media` custom field to any content type (via the Content-Type Builder, or in schema):

```json
{
  "attributes": {
    "hero": {
      "type": "customField",
      "customField": "plugin::sirv.sirv-media",
      "options": { "allowedTypes": ["image", "video"] }
    }
  }
}
```

Editors see a "Pick from Sirv" button that opens the DAM browser; picking an asset stores a
`SirvFieldValue` (a discriminated union over image | video | spin | view).

That stored value is exactly what `@sirv/react` consumes - render it directly, no converter:

```tsx
import { SirvProvider, SirvMedia } from '@sirv/react';

// `article.hero` is the stored sirv-media value
<SirvProvider>
  <SirvMedia value={article.hero} width={800} />
</SirvProvider>;
```

## Requirements

- Strapi `^5.0.0`
- Node `>=20`
- React `^18 || ^19`, `@strapi/design-system` v2

## Develop (from the monorepo)

```bash
pnpm --filter @sirv/strapi-plugin build       # build to dist/
pnpm --filter @sirv/strapi-plugin typecheck
pnpm --filter @sirv/strapi-plugin test
```

The package builds with [`@strapi/sdk-plugin`](https://github.com/strapi/sdk-plugin) into
`dist/admin` and `dist/server`, exposed via the `./strapi-admin` and `./strapi-server` package
exports.

## License

MIT
