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

The field stores a `SirvFieldValue` (a discriminated union over image | video | spin | view).
Render it on your frontend with `@sirv/react`.

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
