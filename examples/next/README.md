# Next.js example

Renders Sirv Showcase entries from the example Strapi app using
[`@sirv/react`](https://www.npmjs.com/package/@sirv/react) - one component per asset type.

The stored `sirv-media` value is already a `@sirv/react` `SirvMediaLike`, so it is passed straight
to the components as `value` (no converter needed):

```tsx
import { SirvProvider, SirvImage, SirvVideo, SirvSpin, SirvView, SirvMedia } from '@sirv/react';

<SirvProvider>
  <SirvImage value={showcase.image} width={640} />
  <SirvVideo value={showcase.video} width={640} />
  <SirvSpin  value={showcase.spin} width={500} height={500} />
  <SirvView  value={showcase.viewer} width={640} height={440} />
  <SirvMedia value={showcase.anyMedia} width={640} />
</SirvProvider>;
```

## Run

```bash
# 1. Start the example Strapi app and connect a Sirv account (see examples/strapi)
pnpm --filter sirv-strapi-example develop

# 2. In Strapi: create a "Sirv Showcase" entry, pick an asset for each field, and PUBLISH it.

# 3. Start this app
cp examples/next/.env.example examples/next/.env.local   # defaults point at localhost:1337
pnpm --filter sirv-strapi-next-example dev                # http://localhost:3000
```

The example Strapi app grants the public role read access to the Showcase type (in its
`src/index.ts` bootstrap), so no API token is required. To use a token instead, set
`STRAPI_API_TOKEN` in `.env.local`.

## Notes

- Spins and views load `sirv.js` at runtime (client-side) for interactive rendering.
- Unlike a Strapi admin, a Next app has no restrictive CSP, so Sirv assets load without extra
  config. If you add your own CSP, allow `*.sirv.com` and `scripts.sirv.com`.
