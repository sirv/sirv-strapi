# Deploying the example Strapi (live demo)

The Strapi admin is a SPA that needs its Node backend running, so a live demo must run on a Node
host (a static file host is not enough). This guide deploys `examples/strapi` (with
`@sirv/strapi-plugin` installed) as a container.

The image comes up **ready to use**:
- A super-admin is auto-created from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (so nobody has to
  register).
- If `SIRV_CLIENT_ID` / `SIRV_CLIENT_SECRET` are set, the Sirv account is auto-connected on boot.

## 1. Required environment variables

Generate random secrets (e.g. `openssl rand -base64 16` each):

| Var | Purpose |
|---|---|
| `APP_KEYS` | Comma-separated app keys (2+), also the encryption root for stored Sirv tokens |
| `API_TOKEN_SALT` | Strapi API token salt |
| `ADMIN_JWT_SECRET` | Admin auth secret |
| `TRANSFER_TOKEN_SALT` | Transfer token salt |
| `JWT_SECRET` | Users-permissions JWT secret |
| `ENCRYPTION_KEY` | Strapi admin secrets encryption key |
| `SEED_ADMIN_EMAIL` | Demo admin email (auto-created if no admin exists) |
| `SEED_ADMIN_PASSWORD` | Demo admin password (8+ chars, upper/lower/number) |
| `SIRV_CLIENT_ID` | (optional) Sirv REST Client ID - auto-connects the demo |
| `SIRV_CLIENT_SECRET` | (optional) Sirv REST Client secret |

## 2. Build & run with Docker (any host)

From the repo root:

```bash
docker build -t sirv-strapi-demo .
docker run -p 1337:1337 --env-file demo.env \
  -v sirv_strapi_db:/app/examples/strapi/.tmp \
  sirv-strapi-demo
```

The volume keeps the SQLite database across restarts. Without it, the DB resets on restart - but
the seed admin and auto-connect bring it back automatically, which is fine for a throwaway demo.

> Build memory: the Strapi admin build (Vite) needs ~2 GB+ of RAM. Docker Desktop defaults to a
> small VM - raise it to 4 GB (Settings -> Resources) or the build is OOM-killed. Cloud build
> environments (Render/Railway/Fly) have enough by default. The image sets
> `NODE_OPTIONS=--max-old-space-size=4096`.

Open `http://localhost:1337/admin` and log in with the seed credentials.

## 3. One-click hosts

- **Render / Railway / Fly.io**: point the service at this repo, use the root `Dockerfile`, set the
  env vars above, expose port `1337`. On Render, add a Disk mounted at
  `/app/examples/strapi/.tmp` for persistence (or switch to Postgres, below).
- **Strapi Cloud**: deploy `examples/strapi` as the project root. Add `@sirv/strapi-plugin` as a
  dependency (from npm once published, or vendor the built `dist`). Set the same env vars.

## 4. Persistence for a longer-lived demo (optional)

SQLite on a mounted disk is enough for a demo. For a managed DB, set these and add `pg` to the
example's dependencies:

```
DATABASE_CLIENT=postgres
DATABASE_URL=postgres://user:pass@host:5432/db
```

(You would extend `examples/strapi/config/database.ts` to read `DATABASE_CLIENT`/`DATABASE_URL`.)

## 5. Hosting at tools.sirv.com

Two options:

- **Subdomain (recommended, simplest):** point e.g. `strapi-demo.sirv.com` at the Node service.
  Set `URL=https://strapi-demo.sirv.com` (wire it into `config/server.ts` as
  `url: env('URL')`). Nothing else changes.
- **Subpath `tools.sirv.com/strapi/`:** put a reverse proxy in front that forwards `/strapi/` to
  the service, and set `URL=https://tools.sirv.com/strapi`. Strapi then serves its admin under that
  base path. A subdomain avoids this extra proxy/base-path config.

## Notes

- The admin CSP already allows `*.sirv.com` (see `config/middlewares.ts`), so DAM thumbnails and
  previews work in the hosted admin.
- `SEED_ADMIN_*` and `SIRV_*` are demo conveniences. Do not use auto-seed / auto-connect for a
  real production instance.
