# UniConnect Production Deployment

Last reviewed: 2026-06-14

## Overview

UniConnect is deployed as a Docker container on Azure App Service. The
`Dockerfile` and `.dockerignore` live at the **repository root**. Deployment
is fully automated via `.github/workflows/deploy-azure.yml`.

Live URL: `https://uni-connect.dev`

## Production Architecture

```
https://uni-connect.dev
  -> Azure App Service for Linux (B1 Basic plan, Central India)
     -> Docker container: ghcr.io/<repo>:latest
        -> Node 24 / Express 5 serves React build from /app/public
        -> /api REST routes
        -> /api/socket.io Socket.IO
  -> Azure Database for PostgreSQL Flexible Server, PostgreSQL 18
     (B1ms Burstable, Central India)
     -> uniconnect_prod   (live application)
     -> uniconnect_demo   (seeded demo data for presentations)
     -> uniconnect_test   (manual pre-release testing from laptop)
  -> Cloudinary  (file uploads)
  -> Resend      (transactional email from noreply@uni-connect.dev)
```

## CI/CD Pipeline

```
push to main  ──or──  pull_request → main
  ├── integration-tests   Jest + postgres:18-bookworm service container
  │     └── on pass → triggers docker-build-push
  ├── e2e-tests           Playwright in mcr.microsoft.com/playwright:v1.58.2-noble
  │     └── informational on main  /  gates merge on PRs
  ├── docker-build-push   Multi-stage image → ghcr.io  (needs: integration-tests)
  └── deploy              migrate → update image → restart → health check
                          (needs: docker-build-push, main branch only)
```

## Dockerfile Structure

Three-stage multi-stage build at the repository root:

**Stage 1 — `client-builder` (`node:24-alpine`)**
- Installs client npm packages.
- Runs `npx vite build` → produces `client/dist/`.

**Stage 2 — `server-builder` (`node:24-alpine`)**
- Installs all server npm packages (dev included — needed for `tsc`).
- Runs `npx prisma generate` **explicitly** (there is no `postinstall` script;
  omitting this step causes a runtime module-not-found crash).
- Compiles TypeScript → `dist/`.
- Strips devDependencies: `npm prune --omit=dev`.

**Stage 3 — `production` (`node:24-alpine`)**
- Fresh base image.
- Installs `dumb-init` (correct signal forwarding to Node as PID 1).
- Creates a non-root `appuser`.
- Copies from Stage 2: `node_modules/`, `dist/`, `prisma/`, `package.json`.
- Copies from Stage 1: `client/dist/` → `./public/` (Express serves this).
- Runs as `appuser`.
- `ENTRYPOINT ["dumb-init", "--"]` / `CMD ["node", "dist/server.js"]`.

The Prisma client is generated into `node_modules/.prisma/client` (default
location) and travels into the production stage with `node_modules`.

## GitHub Secrets Required

| Secret | Description |
|---|---|
| `AZURE_CREDENTIALS` | JSON output of `az ad sp create-for-rbac` (contributor on resource group) |
| `AZURE_WEBAPP_NAME` | App Service name |
| `AZURE_RESOURCE_GROUP` | `rg-uniconnect-prod` |
| `PRODUCTION_DATABASE_URL` | `postgresql://...uniconnect_prod?sslmode=require` |

The `GITHUB_TOKEN` secret is automatic and used for pushing to `ghcr.io`.

## Azure Infrastructure

| Resource | Name | Details |
|---|---|---|
| Resource group | `rg-uniconnect-prod` | Central India |
| PostgreSQL server | `uniconnect-pg-server` | PostgreSQL 18, B1ms Burstable |
| App Service Plan | `asp-uniconnect-prod` | B1 Basic |
| App Service | `uniconnect-prod` (or similar) | Linux, Container mode |
| Custom domain | `uni-connect.dev` | Acquired fron name.com using GitHub Student Pack. |

### App Service Application Settings

All secrets are stored as Azure App Service Application Settings (encrypted at
rest). The following must be present:

```
NODE_ENV                    production
LOG_LEVEL                   info
DATABASE_URL                postgresql://...uniconnect_prod?sslmode=require
JWT_ACCESS_SECRET           <32+ random chars>
JWT_REFRESH_SECRET          <32+ random chars>
JWT_ACCESS_EXPIRY           15m
JWT_REFRESH_EXPIRY          7d
RESET_PASSWORD_SECRET       <32+ random chars>
RESET_PASSWORD_EXPIRY       1h
RESEND_API_KEY              <Resend API key>
RESEND_FROM_EMAIL           noreply@uni-connect.dev
CLOUDINARY_CLOUD_NAME       <cloud name>
CLOUDINARY_API_KEY          <api key>
CLOUDINARY_API_SECRET       <api secret>
CORS_ORIGIN                 https://uni-connect.dev
CSRF_ENABLED                true
CSRF_SECRET                 <32+ random chars>
CSRF_TRUSTED_ORIGINS        https://uni-connect.dev
AUTH_COOKIE_SAME_SITE       strict
AUTH_COOKIE_SECURE          auto
SENTRY_DSN                  (leave blank to disable)
SENTRY_ENVIRONMENT          production
SENTRY_RELEASE              (leave blank)
SENTRY_TRACES_SAMPLE_RATE   0
```

Do **not** set `PORT`. Azure injects it into the container automatically.

Production application logs are structured Pino JSON written to stdout/stderr
for Azure App Service container log collection or a future external log
pipeline. The app does not write or rotate local log files. Keep `LOG_LEVEL=info`
unless temporarily diagnosing an incident, then return it to `info`.

## Database Usage

| Database | Used by | How migrations run |
|---|---|---|
| `uniconnect_prod` | Live application | Automatically by CI/CD deploy job on every push to `main` |
| `uniconnect_demo` | Seeded demo data for presentations | Manually from laptop (see Seeding below) |
| `uniconnect_test` | Manual pre-release testing from laptop | Manually via `npx prisma migrate deploy` |

CI test jobs (integration and e2e) use **ephemeral service containers** — none
of the three Azure databases are touched during CI runs.

## Seeding Demo Data

Before a presentation, seed `uniconnect_demo`:

1. Add your current IP to the PostgreSQL server firewall:
   Azure portal → PostgreSQL server → **Networking** → add IP → **Save**.

2. Set `DATABASE_URL` in `server/.env` temporarily:
   ```
   DATABASE_URL=postgresql://<user>:<pass>@<server>.postgres.database.azure.com:5432/uniconnect_demo?sslmode=require
   ```

3. Run migrations then seed:
   ```bash
   cd server
   npx prisma migrate deploy
   npm run db:seed
   ```

4. Remove your IP from the PostgreSQL firewall after seeding.

5. Restore `server/.env` to point at your local database.

## Custom Domain (`uni-connect.dev`)

DNS is managed at the domain registrar. The following records are in place:

- **A record**: `uni-connect.dev` → App Service IP (for Azure domain binding)
- **TXT record**: Azure domain ownership verification
- **TXT/CNAME records**: Resend DKIM and SPF for `noreply@uni-connect.dev`

The Azure App Service managed certificate covers `uni-connect.dev` and
auto-renews. No manual certificate renewal is required.

If `CORS_ORIGIN` or `CSRF_TRUSTED_ORIGINS` ever need updating (e.g. adding
`www.uni-connect.dev`), update the App Service Application Settings and restart.

## Deploying A New Version

For normal code changes: push to `main`. The pipeline runs automatically.

To trigger manually without a code push:
GitHub → Actions → **CI / Deploy** → **Run workflow** → select `main`.

## Rolling Back

Azure App Service keeps the previous container image tag. To roll back:

1. In Azure portal → App Service → **Deployment Center**, identify the previous
   SHA tag (e.g. `sha-a1b2c3`).
2. Run via Azure CLI:
   ```bash
   az webapp config container set \
     --name <app-service-name> \
     --resource-group rg-uniconnect-prod \
     --container-image-name ghcr.io/<repo>:sha-a1b2c3
   az webapp restart --name <app-service-name> --resource-group rg-uniconnect-prod
   ```
3. If the rollback involves a schema change, restore the database from backup
   before restarting.

## Health Check

```
GET https://uni-connect.dev/api/health
```

Expected when healthy:
```json
{ "success": true, "message": "OK", "db": "ok" }
```

The CI/CD deploy job polls this endpoint every 10 seconds for up to 4 minutes
after restarting the App Service.

## Backup

Before major demo data changes, export a dump (add your IP to the firewall first):

```bash
pg_dump "postgresql://<user>:<pass>@<server>.postgres.database.azure.com:5432/uniconnect_demo?sslmode=require" \
  > backup_$(date +%Y%m%d).sql
```

Do not commit dumps to the repository.

## Troubleshooting

### Container exits immediately on startup

Check App Service → **Log stream**. The most common causes:
- A required environment variable is missing. The app validates all env vars on
  startup and exits if any are absent. The error names the missing variable.
- `prisma generate` was not run during the Docker build. If `node_modules/.prisma/client`
  is absent, imports of the Prisma client will fail at startup.

### App root returns JSON 404 (React app not loading)

`/app/public/index.html` is missing from the container. Check Docker Stage 1
in the build log — `npx vite build` must complete and the `COPY` in Stage 3
must copy `client/dist/` to `./public/`.

### Login fails with CSRF error

`CORS_ORIGIN` and `CSRF_TRUSTED_ORIGINS` in App Settings must exactly match
the browser URL — scheme, hostname, no trailing slash:
```
CORS_ORIGIN=https://uni-connect.dev
CSRF_TRUSTED_ORIGINS=https://uni-connect.dev
```

### Socket.IO real-time features not working

On Linux App Service, WebSockets are always on — there is no toggle to check.
Possible causes:
- `mustChangePassword === true`: the app intentionally blocks Socket.IO until
  the forced password change is completed.
- App Service is still warming up after a restart. Wait 30 seconds and reload.

### Migration fails: `function uuidv7() does not exist`

The PostgreSQL server version is below 18. Confirm version in Azure portal →
PostgreSQL server → Overview.

### Deploy job: image reference rejected by Azure

ghcr.io image names must be strictly lowercase. The workflow converts the image
reference to lowercase before calling `az webapp config container set`. If this
error recurs, confirm `IMAGE_NAME` (which derives from `github.repository`) does
not contain uppercase characters after substitution.

### Playwright e2e service container uses hostname `postgres`, not `localhost`

Inside the Microsoft Playwright container, the PostgreSQL service is reachable
at hostname `postgres` (the service name), not `localhost`. The workflow sets
`DATABASE_URL` accordingly. Do not change this to `localhost` for the e2e job.

## Upgrade Path

Before scaling or adding real institutional users:

1. Move PostgreSQL to a paid tier with point-in-time restore enabled.
2. Enable Sentry: set `SENTRY_DSN` and keep `SENTRY_TRACES_SAMPLE_RATE` low or
   `0` unless tracing is intentionally needed.
3. Add uptime/log monitoring (Azure Application Insights or external) and set
   retention/alerting for stdout JSON logs.
4. Add Redis for rate-limit coordination and Socket.IO adapter before
   horizontal scaling beyond one App Service instance.
5. Add MFA for admin accounts before live institutional data is in the system.
6. Write a formal backup and restore runbook.
7. For the Capacitor Android wrapper phase, add a device-token table and FCM
   push endpoints, and set `server.url` in `capacitor.config.ts` to
   `https://uni-connect.dev`.

## Reference Links

- Azure App Service Linux FAQ (WebSockets always on): https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/faqs-app-service-linux-new
- Azure App Service with Docker containers: https://learn.microsoft.com/en-us/azure/app-service/tutorial-custom-container
- Azure App Service custom domains: https://learn.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain
- Azure PostgreSQL Flexible Server: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/overview
- GitHub Container Registry: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Resend domain verification: https://resend.com/docs/dashboard/domains/introduction
