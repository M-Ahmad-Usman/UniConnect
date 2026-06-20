# Dependency Version Audit

**Date:** 2026-06-17

This document records the direct dependency audit for the UniConnect client and server. It identifies which packages are current, which updates were applied, and how transitive software vulnerabilities have been actively addressed using targeted configuration blockages (`overrides`) rather than raw breaking framework jumps.

## Audit Method

* Compared direct dependencies in `client/package.json` and `server/package.json` against the npm registry using `npm outdated`.
* Ran targeted `npm audit` calls within frontend and backend workspaces to map deep sub-dependencies causing security notifications.
* Analyzed and integrated selective pinning structures into workspace configurations to patch nesting exploits cleanly without disrupting root frameworks.

## Executive Summary

* **Security Target Met:** Both the frontend workspace (`client`) and backend workspace (`server`) yield **0 vulnerabilities** under active `npm audit` verification runs.
* **Transitive Remediation Strategy:** Rather than processing aggressive `--force` upgrades that break tooling bounds (e.g., forcing a Vite 8 update or dropping Jest environments to v27), nesting trees are held secure through managed `"overrides"` targets.
* **Client Security Blocks:** Patched direct paths for `hono` and `qs` while introducing a verified override parameter pinning `esbuild` to eliminate unauthorized file read and code execution indicators.
* **Server Security Blocks:** Cleared vulnerabilities by enforcing targeted overrides on `@hono/node-server` and `js-yaml` (mitigating algorithmic denial of service bugs pulled in through the testing matrix).
* **Runtime Alignment:** Direct framework elements including Prisma Ecosystem v7.4.2, Express v5.2.1, and Vitest configurations are validated as functional alongside the remediation blocks.

## Client Audit

| Package | Current line in manifest | Latest registry version | Recommendation | Status / Action |
| --- | --- | --- | --- | --- |
| `@eslint/js` | `^9.39.4` | `10.0.1` | Defer | Retained on v9 due to upstream plugin constraints. |
| `eslint` | `^9.39.1` | `10.0.2` | Defer | Retained on v9; plugin peer matrices do not support v10 yet. |
| `eslint-plugin-react-refresh` | `^0.5.2` | `0.5.2` | Current | Aligned. |
| `globals` | `^17.4.0` | `17.4.0` | Current | Aligned. |
| `@types/node` | `^24.10.1` | `25.3.5` | Defer | Aligned to runtime targets; do not pre-fetch Node 25 schemas. |
| `@vitest/coverage-v8` | `^4.1.8` | `4.1.8` | Current | Active. Used in test coverage evaluation. |
| `axios` | `^1.17.0` | `1.17.0` | Current | Secure. |
| `react-router-dom` | `^7.17.0` | `7.17.0` | Current | Production framework baseline. |
| `vitest` | `^4.1.8` | `4.1.8` | Current | Primary frontend test runner. |
| `@sentry/react` | `^10.53.1` | `10.53.1` | Current | Telemetry module. |
| `@sentry/vite-plugin` | `^5.3.0` | `5.3.0` | Current | Build integration module. |

## Server Audit

| Package | Current line in manifest | Latest registry version | Recommendation | Status / Action |
| --- | --- | --- | --- | --- |
| `@prisma/adapter-pg` | `^7.4.2` | `7.4.2` | Current | Active engine layer. |
| `@prisma/client` | `^7.4.2` | `7.4.2` | Current | Generation client layer. |
| `prisma` | `^7.4.2` | `7.4.2` | Current | Data framework platform baseline. |
| `pg` | `^8.20.0` | `8.20.0` | Current | Core database connection protocol interface. |
| `pino` | `^10.3.1` | `10.3.1` | Current | Structured backend application logger. |
| `pino-http` | `^11.0.0` | `11.0.0` | Current | Express HTTP completion logging middleware. |
| `pino-pretty` | `^13.1.3` | `13.1.3` | Current | Development-only log formatter. |
| `resend` | `^6.9.3` | `6.9.3` | Current | Active email communications delivery framework. |
| `@types/multer` | `^2.1.0` | `2.1.0` | Current | Multiform streaming upload typing constraints. |
| `@types/pg` | `^8.18.0` | `8.18.0` | Current | Core engine connection typing layouts. |
| `@types/supertest` | `^6.0.3` | `^6.0.3` | Current | API test execution mapping layouts. |
| `@sentry/node` | `^10.53.1` | `10.53.1` | Current | Backend exception monitoring engine block. |

## Explicit Workspace Vulnerability Overrides

The following tracking declarations have been loaded into configuration structures to freeze vulnerable dependencies down to patched release paths:

### 1. Client Configurations (client/package.json)

"overrides": {
"hono": "^4.12.21",
"qs": "^6.15.2",
"esbuild": "^0.28.1"
}

* **esbuild Target Fix (^0.28.1):** Neutralizes GHSA-gv7w-rqvm-qjhr which creates arbitrary file access configurations on Windows developer nodes, and blocks RCE vectors inside local execution scopes.

### 2. Server Configurations (server/package.json)

"overrides": {
"@hono/node-server": "^1.19.13",
"js-yaml": "^4.2.0"
}

* **@hono/node-server Target Fix (^1.19.13):** Resolves critical middleware bypass exploits where modified slash formats bypassed access evaluation boundaries.
* **js-yaml Target Fix (^4.2.0):** Addresses the CPU exhaustion algorithmic exploit (GHSA-h67p-54hq-rp68) inside nested components pulled by development compilation toolchains.

## Breaking Changes and Upgrade Notes

### 1. ESLint 10 and @eslint/js 10

* **Decision:** Postponed indefinitely.
* **Blockers:** Upstream engine plugins (`eslint-plugin-react-hooks`) have not extended validation compatibility parameters into the major v10 framework tier yet. Forcing it creates peer-dependency execution crashes during lint checks.

### 2. @types/node 25 Alignment

* **Decision:** Postponed intentionally.
* **Reason:** The active UniConnect compilation ecosystem container architecture relies explicitly on a **Node 24** build surface (`node:24-alpine`). Importing version 25 declaration trees creates false typing metrics for operational parameters that don't exist inside the production layer.

## Lifecycle Management & Maintenance Plan

To prevent dependency overrides from degrading into dead technical blocks, follow this review routine:

1. **Upstream Monitoring:** When performing direct structural framework changes (e.g., upgrading Vite or Prisma to their next minor/major versions), temporarily drop the `"overrides"` key from the local `package.json`.
2. **Re-Auditing Frameworks:** Perform a complete cycle cleanup (`rm -rf node_modules package-lock.json && npm install && npm audit`).
3. **Pruning Blocks:** If the core providers have naturally raised their underlying requirements to secure variants, omit the overrides entirely to keep the module resolution chain natively fluid.

## Post-Remediation Verification Checklist

Before certifying repository branches, confirm health metrics match across terminal pipelines:

### Client Target Verification

* [ ] Run `npm run lint` — Confirm the flat config pipeline executes without parsing errors.
* [ ] Run `npm run type-check` — Confirm type trees evaluate error-free under the current engine.
* [ ] Run `npm run build` — Confirm bundling routines process the code into correct distribution packages.

### Server Target Verification

* [ ] Run `npm run build` — Verify TypeScript compiler maps output artifacts cleanly into `dist/`.
* [ ] Run `npm test` — Ensure your Jest configuration parses routing arrays and validates databases correctly.
* [ ] Run `npx prisma generate` — Confirm data client outputs map correctly to the active schema structures.
