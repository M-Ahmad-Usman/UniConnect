# Azure Concepts for UniConnect Developers

This document explains the Azure concepts behind the UniConnect production
deployment so future developers understand what exists and why, not just how to
operate it. Read `docs/deployment.md` for operational steps.

---

## What Is Azure App Service?

Azure App Service is a managed platform for running web applications. You give
it a Docker container image and it handles the Linux server, HTTPS termination,
process restarts, and health monitoring. You do not install or maintain the OS.

UniConnect uses App Service in **Container mode** (not Code mode). This means
Azure pulls and runs the Docker image you push to `ghcr.io`, rather than
receiving a zip of source files.

---

## What Is The App Service Plan?

The App Service Plan is the underlying compute allocation. The Web App (App
Service) runs on top of it. You pay for the plan, not the individual web app.

UniConnect uses **B1 Basic** (~$13/month from Azure for Students credit):

| Tier | WebSockets | Always On | Custom domain + HTTPS |
|------|-----------|-----------|----------------------|
| F1 Free | Max 5 concurrent | No | No |
| B1 Basic | Unlimited | Yes | Yes |

F1 is unsuitable for UniConnect because the 5-connection WebSocket cap breaks
Socket.IO under any real concurrent load. B1 removes this limit and keeps the
app running continuously (no cold starts).

---

## WebSockets On Linux App Service

On **Linux** App Service (which UniConnect uses), WebSockets are permanently
enabled at every tier. There is no toggle in the Azure portal. If you look for
a "Web sockets" on/off switch and cannot find it, that is correct — you do not
need to enable anything.

This is different from Windows App Service, which does have a toggle.

---

## What Is The Resource Group?

A resource group (`rg-uniconnect-prod`) is a logical container for all Azure
resources in the project. Every resource — App Service, PostgreSQL server,
App Service Plan — belongs to this group. Deleting the group deletes everything
inside it in one operation.

---

## What Is Azure PostgreSQL Flexible Server?

A fully managed PostgreSQL service. Azure runs the database server; you connect
to it and use it like any PostgreSQL database. UniConnect requires **PostgreSQL
18** because the migration baseline uses `uuidv7()`, which is built into
PostgreSQL 18 natively. Lower versions will fail migrations.

Three databases are provisioned on one server: `uniconnect_prod`,
`uniconnect_demo`, and `uniconnect_test`. See `docs/deployment.md` for how each
is used.

---

## What Are Application Settings?

Application Settings are Azure's encrypted key-value store for environment
variables. They are injected as `process.env` variables when the container
starts — equivalent to a `.env` file, but encrypted at rest and never visible
in your code or deployment package.

Do not set `PORT`. Azure injects it into the container automatically at
runtime.

---

## What Is A Service Principal?

A service principal is a non-interactive identity in Azure Active Directory.
GitHub Actions uses it to authenticate to Azure without human login. It was
created with `az ad sp create-for-rbac`, scoped to `rg-uniconnect-prod` with
`contributor` role. The JSON credential is stored as the `AZURE_CREDENTIALS`
GitHub Secret.

---

## What Is GitHub Container Registry (ghcr.io)?

`ghcr.io` is GitHub's built-in Docker image registry. The CI/CD pipeline
pushes the production Docker image here after a successful integration test
run. Azure App Service pulls the image from `ghcr.io` on each deployment.

Authentication from GitHub Actions to `ghcr.io` uses the automatically
provided `GITHUB_TOKEN` — no separate credentials are needed.

Each push produces two tags:
- `latest` — always points to the most recent successful build on `main`.
- `sha-<short>` — immutable tag tied to the specific commit, used for rollbacks.

---

## What Is A Service Container In GitHub Actions?

Test jobs need a real PostgreSQL database. Rather than connecting to the Azure
database (which would be slow, coupled, and risky), GitHub Actions starts a
`postgres:18-bookworm` Docker container alongside the test job. It exists only
for the duration of the job and is destroyed after.

This is why CI test jobs connect to `localhost:5433` (integration job) or
`postgres:5432` (e2e job inside the Playwright container) — not to any Azure
resource.

---

## Why The E2E Job Uses A Microsoft Playwright Container

The e2e job runs inside `mcr.microsoft.com/playwright:v1.58.2-noble`, Microsoft's
official Playwright image, which includes Chromium pre-installed. This avoids
running `npx playwright install --with-deps` (which downloads ~300 MB of
browser binaries on every CI run).

Inside this container, network service names resolve differently: the PostgreSQL
service is reachable at hostname `postgres` (the Docker Compose service name),
not `localhost`. The workflow sets `DATABASE_URL` and e2e env vars accordingly.

---

## Why The Deploy Job Runs Migrations Separately From The Docker Build

Migrations must run against the live database **after** a new image is ready
but **before** the new code starts receiving traffic. Running `prisma migrate
deploy` inside the Docker build would apply schema changes at build time, before
the image is deployed — which could cause the running old code to encounter an
incompatible schema mid-flight.

The correct order is:
1. Build and push the image.
2. Run `prisma migrate deploy` against `uniconnect_prod`.
3. Update App Service to pull the new image.
4. Restart App Service.
5. Verify health check passes.

---

## What Is `dumb-init`?

When Docker stops a container, it sends `SIGTERM` to process ID 1. If a shell
script is PID 1, it may not forward the signal to Node.js, causing Docker to
force-kill the container after a timeout — interrupting in-flight requests.

`dumb-init` is a tiny init process that sits as PID 1 and forwards all signals
to its child process (Node.js). The Dockerfile uses:

```
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

This ensures Node receives `SIGTERM` and can drain connections gracefully before
the container stops.

---

## What Is The Custom Domain Setup?

`uni-connect.dev` is registered at a domain registrar. The following DNS records
are in place:

- **A record**: `uni-connect.dev` → App Service IP (routes traffic to Azure).
- **TXT record**: Azure domain ownership proof (required before Azure will bind
  the domain).
- **TXT/CNAME records**: Resend DKIM and SPF (required for outbound email from
  `noreply@uni-connect.dev` to pass spam filters).

The **Azure App Service Managed Certificate** covers `uni-connect.dev` with
HTTPS and auto-renews. No manual certificate management is required.

---

## Why Express Serves The React Build (Single-Domain Model)

UniConnect uses httpOnly cookies, CSRF protection, and Socket.IO — all of which
rely on same-origin behaviour. If the frontend were hosted on a separate domain
from the API, you would need cross-origin cookies (`SameSite=None; Secure`),
CORS, and Socket.IO cross-origin configuration — all of which add fragility.

By having Express serve the React build from `server/public/` (which maps to
`/app/public/` in the container), both the frontend and the API share the same
origin. Cookies, CSRF, and Socket.IO work with zero extra configuration.

The build pipeline copies `client/dist/` into `./public/` in Docker Stage 3.
Express serves `public/index.html` for any request that does not start with
`/api`. API routes and Socket.IO remain under `/api`.

---

## Cost Notes

All Azure resources for UniConnect are funded by the Azure for Students credit
($100 total, no credit card). Approximate monthly costs:

| Resource | Monthly cost |
|---|---|
| App Service B1 Basic | ~$13 |
| PostgreSQL B1ms (free allowance) | $0 (within 12-month free tier) |
| Bandwidth, storage | Minimal at this scale |

At ~$13/month, the credit provides approximately 7 months of runway. Configure
a budget alert in Azure Cost Management to avoid unexpected charges.
