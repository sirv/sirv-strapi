# Sirv REST API notes (for the Strapi plugin)

Practical engineering reference for the Sirv endpoints the `@sirv/strapi-plugin` server proxy needs: end-user authentication, DAM browse/search, asset metadata, URL building, and error/rate-limit behaviour. This is a working reference, not the full API surface.

## Source of truth

Files actually read to produce this document:

- `/Users/igor/www/sirv/sirv/rest-api/docs-next/llms-full.txt` (full condensed API reference)
- `/Users/igor/www/sirv/sirv/rest-api/docs-next/md/Authentication/postV2Token.md`
- `/Users/igor/www/sirv/sirv/rest-api/docs-next/md/Files/getV2FilesReaddir.md`, `.../postV2FilesSearch.md`, `.../postV2FilesSearchScroll.md`, `.../getV2FilesStat.md`, `.../getV2FilesMeta.md`
- `/Users/igor/www/sirv/sirv/rest-api/docs-next/md/Account/getV2AccountLimits.md`, `.../getV2Account.md`, `.../getV2AccountStorage.md`
- `/Users/igor/www/sirv/sirv/rest-api/docs-next/swagger.source.json` (only the `/token` response schema is populated; `/account/limits`, `/files/readdir`, `/files/stat` schemas are empty stubs in both `openapi.json` and `swagger.source.json`)
- Sanity plugin client (response shapes verified against the live API): `/Users/igor/Projects/Sirv/extensions/sanity/packages/sirv-client/src/{client,http,dam,asset-type,types,token-manager,account,errors,live.test}.ts`
- Hosted login + account-picker flow (the email/password/OTP path, run server-side): `/Users/igor/Projects/Sirv/extensions/webflow/services/webflow-api/src/clients/sirv-client.ts`, `.../routes/sirv-connect.ts`, `/Users/igor/Projects/Sirv/extensions/webflow/packages/shared/src/{types,schemas}.ts`
- URL building / dynamic imaging: `/Users/igor/Projects/Sirv/extensions/sanity/packages/url-builder/src/{build-url,transformations}.ts`
- Web articles (via WebFetch): https://sirv.com/help/articles/dynamic-imaging/ and https://sirv.com/help/articles/responsive-images-smv/

Base URL for all REST calls: `https://api.sirv.com/v2`. All requests are JSON and authenticated with `Authorization: Bearer <token>` except `POST /token` itself.

---

## 1. Authentication

There are TWO distinct credential paths. The Strapi plugin uses both, at different layers.

### Path A - Machine credentials (clientId + clientSecret -> bearer)

This is the standard, fully documented Sirv auth. A REST API client ID / secret pair is exchanged for a short-lived bearer token. Used for every actual API call (browse, search, stat, account).

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/v2/token` | Mint a bearer token from clientId + clientSecret | none (credentials in body) |

Request body:

```json
{ "clientId": "<id>", "clientSecret": "<secret>", "expiresIn": 1200 }
```

`expiresIn` is optional. Response (schema confirmed in swagger.source.json; `scope` optional):

```json
{ "token": "<jwt>", "expiresIn": 1200, "scope": ["..."] }
```

Key facts:

- Bearer tokens expire after ~20 minutes (1200 s). `expiresIn` in the response is seconds remaining.
- **There is no refresh token in Sirv.** When a token expires, re-mint from the stored clientId/secret. The Sanity client caches the bearer with a 60 s expiry skew and re-mints on demand, and also transparently re-mints once on a `401` then retries the request (see `token-manager.ts`, `client.ts`).
- The clientId/secret are the durable credential. Store these encrypted; the bearer is ephemeral and never needs persisting (optional short-lived cache only).

### Path B - End-user login (email + password + OTP + account picker)

This is the product flow. The user never sees a clientId/secret. They log in with their Sirv email + password (plus OTP if MFA is on), pick an account, and the plugin server fetches that account's REST clientId/secret behind the scenes, then stores them (Path A credentials). After that, Path B is never used again until disconnect.

> These two endpoints (`POST /v2/user/accounts`, `GET /v2/rest/credentials`) are **not** in the published REST docs / llms-full.txt. They are used by the shipping Sirv plugins (Webflow, Framer, Adobe) and the shapes below are taken from that working code, not from the API reference. Treat as "verified by usage, undocumented officially."

Flow (all server-side; the browser only talks to the plugin's own `/sirv/*` endpoints):

1. **Bootstrap an app token.** `POST /v2/token` with the plugin's *app* clientId/secret (a single credential shipped server-side, never exposed to the browser) to get a bearer. This bearer authorizes the login lookup.
2. **List the user's accounts.** `POST /v2/user/accounts` with `Authorization: Bearer <appToken>`.
3. **Filter to connectable roles**, present the account picker.
4. **Fetch per-account REST credentials.** `GET /v2/rest/credentials` with the chosen account's token.
5. **Validate + resolve alias** via `POST /v2/token` then `GET /v2/account`, then persist the clientId/secret encrypted.

| Method | Path | Purpose | Auth header |
| --- | --- | --- | --- |
| POST | `/v2/token` | App bootstrap bearer | none (app clientId/secret in body) |
| POST | `/v2/user/accounts` | Log in, list accounts the user can access | `Bearer <appToken>` |
| GET | `/v2/rest/credentials` | Get per-account clientId/secret for the selected account | `Bearer <account.token>` |
| GET | `/v2/account` | Resolve canonical account alias / CDN host | `Bearer <mintedToken>` |

`POST /v2/user/accounts` request body:

```json
{ "email": "user@example.com", "password": "...", "otpToken": "123456" }
```

`otpToken` is omitted on the first attempt and supplied on retry when OTP is required.

Response interpretation (from `webflow .../clients/sirv-client.ts` `listUserAccounts`):

- **OTP required** when the response is HTTP `417`, OR HTTP `401` with body `{ "message": "Missing authentication" }` and no `otpToken` was sent. Re-prompt the user for the OTP code and resubmit the same call with `otpToken`.
- **Bad email/password** surfaces as `403` (or a body message containing "forbidden"). Treat as invalid credentials.
- **Success** (`200`) returns an array of account objects:

```json
[
  { "alias": "myaccount", "accountId": "...", "role": "owner", "active": true, "token": "<account-scoped-token>" }
]
```

Each account carries its own short-lived `token`; that token is what you pass to `GET /v2/rest/credentials`. The account-picker should only offer accounts whose `role` is connectable. Connectable roles (from `webflow/packages/shared/src/types.ts`):

```
owner, primaryOwner, admin   // user, guest are NOT connectable
```

`GET /v2/rest/credentials` response:

```json
{ "clientId": "<id>", "clientSecret": "<secret>" }
```

These are the durable Path A credentials. Persist encrypted in Strapi's plugin store, then mint bearers from them via `POST /v2/token` for all subsequent API calls.

> Self-hosted variant. The Sanity plugin (no backend) deliberately disabled Path B and instead asks the user to paste their own per-account clientId/secret (`sanity/packages/core/src/hooks/useSirvAuth.ts`). Strapi's admin DOES run server-side code, so the plugin CAN implement the full Path B email/OTP flow server-side (preferred per the spec). The paste-your-own-credentials path is a viable fallback if the app bootstrap credential is not wanted.

### Account / user helper endpoints

| Method | Path | Purpose | Notes |
| --- | --- | --- | --- |
| GET | `/v2/account` | Account info: alias, `cdnURL`, `cdnTempURL`, `aliases` map, fetching status | Used to resolve delivery host(s) for URL building |
| GET | `/v2/account/storage` | Storage usage (bytes; `files` is a count) | |
| GET | `/v2/account/users` | List user IDs + roles for the account | |
| GET | `/v2/user?userId=<id>` | User name, email, S3 key | |
| GET | `/v2/billing/plan` | Plan name, storage/transfer allowances | |

`GET /v2/account` (subset the plugin relies on, from `types.ts` `AccountInfoSchema`):

```json
{
  "alias": "myaccount",
  "cdnURL": "https://myaccount.sirv.com",
  "cdnTempURL": "...",
  "aliases": { "myaccount": { "customDomain": "cdn.example.com" } }
}
```

Delivery host resolution: prefer each alias's `customDomain`, else `<alias>.sirv.com`; the primary `alias` is listed first; fall back to `cdnURL` when `aliases` is empty (see `account.ts` `accountAliasOptions`).

---

## 2. DAM browse / search

### List folder contents (folder tree navigation)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v2/files/readdir` | List immediate children (files + sub-folders) of one folder |

Query params:

| Param | Required | Description |
| --- | --- | --- |
| `dirname` | yes | Absolute folder path, e.g. `/` or `/products/aw26` |
| `continuation` | no | Opaque cursor from a prior page; send to get the next page |

Pagination: a page returns up to ~100 entries (docs say 100; llms-full says "up to 100 results"). When more exist, the response has a non-null `continuation`; pass it back to fetch the next page. There is no sort parameter on `readdir` - use search for sorting.

Response shape (from `types.ts` `ReaddirResponseSchema`, verified against the live API):

```json
{
  "contents": [
    {
      "filename": "shoe-01.jpg",
      "contentType": "image/jpeg",
      "size": 234567,
      "isDirectory": false,
      "mtime": "2024-01-02T10:00:00.000Z",
      "meta": { "width": 2000, "height": 1500, "duration": 0 }
    },
    { "filename": "subfolder", "size": 0, "isDirectory": true }
  ],
  "continuation": "<cursor-or-null>"
}
```

Notes:

- In `readdir`, `filename` is a **basename** (not a full path). Build the full path by joining with `dirname`.
- Folders have `isDirectory: true`. Use this to render the folder tree.
- `meta` (width/height/duration) is present for media files; Sirv returns `null` for missing values (the plugin normalizes null -> undefined). `duration` is 0 for images.

### Search (search by name / tag / type, type-filter chips)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/v2/files/search` | Search files across the whole account by name, path, extension, content type, time, or meta |
| POST | `/v2/files/search/scroll` | Continue a scrolling search past the 1000-result offset cap |

`POST /v2/files/search` body:

| Field | Type | Description |
| --- | --- | --- |
| `query` | string | Lucene-style query (see below) |
| `from` | number | Offset (default 0) |
| `size` | number | Page size (Sanity client defaults to 50) |
| `sort` | object | Optional sort spec, passed through to the API |
| `scroll` | boolean | Start a scrolling search (for >1000 results) |

Offset paging (`from`/`size`) is capped at 1000 results deep. For more, set `scroll: true` on the first call, read `scrollId` from the response, and call `/v2/files/search/scroll` with `{ "scrollId": "..." }` repeatedly until empty. The scroll context lives ~30 s between calls.

Query syntax (Lucene; from `dam.ts` usage and asset-type detection):

| Goal | Query |
| --- | --- |
| Images only | `contentType:image*` |
| Videos only | `contentType:video*` |
| Spins only | `extension:.spin` |
| Views only | `extension:.view` |
| By name | `basename:shoe*` (or free text against `filename`) |
| By tag | meta tag fields (search supports "specific meta information") |

> Type-filter chips (image / video / spin / view): combine the above. **Spins and views MUST be filtered by `extension`, never by `contentType`** - both `.spin` and `.view` report `contentType: "application/json"` (confirmed against the live API; see asset-type detection below).

Response shape (`types.ts` `SearchResponseSchema`):

```json
{
  "hits": [
    {
      "_id": "...",
      "_source": {
        "filename": "/products/aw26/shoe-01.jpg",
        "dirname": "/products/aw26",
        "basename": "shoe-01.jpg",
        "extension": ".jpg",
        "contentType": "image/jpeg",
        "size": 234567,
        "ctime": "2024-01-01T...",
        "mtime": "2024-01-02T...",
        "meta": { "width": 2000, "height": 1500, "duration": 0, "format": "JPEG" }
      }
    }
  ],
  "total": 42,
  "scrollId": "<present only when scroll:true>"
}
```

Notes:

- In search, `_source.filename` is a **full path** (unlike readdir's basename); `basename`, `dirname`, `extension` are also returned.
- `meta.format` is present in search hits but absent in `stat`.
- Up to 1000 results via offset; use scroll beyond that.

### Asset-type classification (image / video / spin / view)

Canonical logic from `sanity/packages/sirv-client/src/asset-type.ts`. Detect by extension first (spin/view/model), then content type:

```
.spin  -> spin    (contentType is "application/json" - DO NOT trust it)
.view  -> view    (contentType is "application/json" - DO NOT trust it)
.glb   -> model   (not used by Strapi MVP; image/video/spin/view only)
contentType starts with "image/" -> image
contentType starts with "video/" -> video
otherwise -> null (unsupported)  // or "file" for a generic-file browse mode
```

How spins and views are represented on Sirv:

- A **360 spin** is a single `.spin` file (a small JSON manifest describing the frame images). Pick the `.spin` path as the asset value; render it with sirv.js / `<SirvSpin>`.
- A **view** is a single `.view` file (also JSON). Pick the `.view` path; render with `<SirvView>`.
- Both report `contentType: application/json`, so classification relies entirely on the `.spin` / `.view` extension.

---

## 3. Asset metadata

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v2/files/stat?filename=<path>` | File info: size, content type, mtime/ctime, isDirectory, media meta |
| GET | `/v2/files/meta?filename=<path>` | ALL meta in one request (tags, title, description, product, dimensions) |
| GET | `/v2/files/meta/tags?filename=<path>` | Just meta tags |
| GET | `/v2/files/meta/description?filename=<path>` | Description (used as image alt text) |

`GET /v2/files/stat` response (`types.ts` `FileStatSchema`):

```json
{
  "size": 234567,
  "contentType": "image/jpeg",
  "isDirectory": false,
  "mtime": "2024-01-02T10:00:00.000Z",
  "ctime": "2024-01-01T09:00:00.000Z",
  "meta": { "width": 2000, "height": 1500, "duration": 0 }
}
```

Notes:

- `meta.width` / `meta.height` give image/video dimensions; `meta.duration` is video length in seconds (0 for images). Sirv returns `null` (not absent) when unknown.
- `stat` does NOT return `meta.format`; if format is needed, use search hits or `/files/meta`.
- Quick alternative without the REST API: append `?info` to any delivery URL (e.g. `https://demo.sirv.com/example.jpg?info`) to get JSON metadata. Useful for spot checks; the REST `stat`/`meta` endpoints are the structured path for the plugin.

Per the plugin's needs, store at pick time: full path, asset type, and dimensions (width/height for image/video) so the frontend can render without an extra round-trip.

---

## 4. URL building, dynamic imaging, signing

### Delivery URL pattern

```
https://<alias>.sirv.com/<path>            (or the account's custom domain)
https://<alias>.sirv.com/<path>?<params>   (with dynamic-imaging params)
```

The plugin builds these client-side from the stored delivery host + the asset path (see `url-builder/src/build-url.ts`). Path segments are percent-encoded (slashes preserved) so spaces / Unicode work.

### Signing / secure URLs

- **Dynamic imaging URLs are NOT signed.** The dynamic-imaging help article documents no signing, token, or auth requirement for resize/format/crop params. Plain delivery URLs with query params work for public assets.
- Signing is only relevant for **protected folders** via JWT. To serve files in a JWT-protected folder you generate a token with `POST /v2/files/jwt` (body: `filename`, `key` (your JWT secret), `expiresIn` (seconds), optional `alias`, `insecureParams`, `secureParams`) and append it to the URL. JWT protection must be enabled on the folder beforehand. The Strapi MVP targets public assets and does not need this; document only.
- No HMAC URL-signing scheme appears in the docs or the existing plugins for normal delivery. If assets are public (the common DAM case), no signing is required.

### Thumbnail URL pattern

For DAM browser thumbnails, append imaging params to the delivery URL:

```
https://<alias>.sirv.com/<path>?thumbnail=256        # square thumbnail, 256px
https://<alias>.sirv.com/<path>?w=200&h=200&scale.option=fill   # explicit fit
https://<alias>.sirv.com/<path>?w=200&format=optimal&q=70       # width-constrained, auto format
```

- For a **video** thumbnail/poster, request an image format off the video URL: `?format=jpg&w=200` (Sirv derives a JPG frame). See `buildVideoPosterUrl`.
- For a **spin/view**, there is no single static thumbnail from the `.spin`/`.view` file directly; render the first frame image, or use sirv.js for a live preview. (Confirm the exact first-frame URL convention - see open questions.)

### Key dynamic-imaging params (subset used by the plugin)

| Friendly name | Sirv param | Notes |
| --- | --- | --- |
| width | `w` | pixels or % |
| height | `h` | pixels or % |
| longest side | `s` | resize by longest dimension |
| scale mode | `scale.option` | `fit` / `fill` / `ignore` / `noup` |
| quality | `q` | 0-100, default 80 |
| format | `format` | `jpg` / `png` / `webp` / `optimal` / `original`; `optimal` negotiates AVIF/WebP (no standalone `avif` param) |
| crop | `cw` / `ch` / `cx` / `cy` / `crop.type` | `crop.type`: `trim` / `poi` / `face` |
| profile (preset) | `profile` | saved preset name |
| download | `dl` | force download |

### Frontend rendering (sirv.js, for spins/views)

The `@sirv/react` components wrap sirv.js. Script include:

```html
<script src="https://scripts.sirv.com/sirvjs/v3/sirv.js"></script>
```

Markup pattern (an image; spins/views use the same `class="Sirv"` + `data-src` pattern pointed at the `.spin` / `.view` path):

```html
<img class="Sirv" data-src="https://demo.sirv.com/tomatoes-basil.jpg">
```

sirv.js determines spin vs view vs image from the file referenced by `data-src` (the `.spin` / `.view` extension), not from distinct markup. The plugin just stores the asset path + type; `@sirv/react` (`<SirvImage>` / `<SirvVideo>` / `<SirvSpin>` / `<SirvView>`) handles the rest.

---

## 5. Rate limits and errors

### Rate limits

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v2/account/limits` | Allowed API requests vs. used in the past 60 minutes |

Sirv rate-limits API requests per rolling 60-minute window. `GET /v2/account/limits` returns the allowance and the count used in the last 60 minutes (exact JSON field names not populated in the OpenAPI spec - see open questions). The plugin should mint and cache bearer tokens (one mint per ~20 min, not per request) and reuse a single token across browse/search calls to stay well under the limit. Expect HTTP `429` when exceeded; back off and retry.

### Error response shape

Non-2xx responses return JSON with a `message` field (and sometimes `error`). The Sanity client surfaces this as `SirvApiError { status, body }` and builds the message from `body.message` (`sirv-client/src/http.ts`, `errors.ts`).

```json
{ "message": "Human-readable error" }
```

Status codes seen in practice:

| Status | Meaning / handling |
| --- | --- |
| `401` | Expired/invalid bearer -> re-mint via `/v2/token` and retry once. During login, `401` + `"Missing authentication"` (no OTP sent) signals OTP required. |
| `403` | Forbidden - during login, treat as wrong email/password; elsewhere, insufficient permission. |
| `410` | (Plugin-side) connect session expired - restart login. |
| `417` | Login: OTP/MFA required - re-prompt and resubmit with `otpToken`. |
| `429` | Rate limited - back off and retry. |

Plugin-level auth error types to model (from `errors.ts`): `OtpRequiredError`, `InvalidCredentialsError`, plus generic `SirvApiError`.

---

## Open questions / unverified

- **`POST /v2/user/accounts` and `GET /v2/rest/credentials` are undocumented** in the official REST reference. Shapes here are taken from the shipping Webflow/Framer plugin code (verified by usage), not the API docs. Re-confirm against a live login before relying on edge cases (exact OTP status codes, account object fields).
- **App bootstrap credential.** Path B requires a single plugin-owned app clientId/secret to authorize `POST /v2/user/accounts`. Confirm how Sirv issues this for the Strapi plugin and whether the same app credential used by Webflow/Framer can be reused.
- **`GET /v2/account/limits` response JSON** - the OpenAPI/swagger schema is an empty stub. Field names for "allowed" vs "used" and the exact `429` body are unverified. Hit the live endpoint to capture them.
- **`POST /token` / `readdir` / `stat` / `search` response schemas** are empty stubs in `openapi.json` and `swagger.source.json` (only `/token`'s is populated). The response shapes documented here come from the Sanity client's Zod schemas, which are annotated as "verified against the live API" but should be re-validated if Sirv changes the API.
- **Spin/view static thumbnail URL.** Confirmed: `.spin`/`.view` are JSON manifests. The exact convention for a static first-frame thumbnail (vs. a live sirv.js preview) is not documented here - inspect a real `.spin` file or the Adobe/Sanity DAM browser to capture the thumbnail URL it uses.
- **`sort` parameter format** for `/v2/files/search` - passed through as an opaque object by the Sanity client; the exact accepted shape (field + direction) is not documented in the sources read.
- **OTP delivery / resend.** The flow assumes the user already has an OTP code from their authenticator/email. No separate "request OTP" or "resend" endpoint was found; verify whether one exists.
