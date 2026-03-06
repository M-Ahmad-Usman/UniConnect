# Dependency Version Audit

**Date:** 2026-03-07

This document records the direct dependency audit for the UniConnect client and server. It identifies which packages are already current, which packages were safely updated during this audit, and which major upgrades should be deferred until their breaking changes are intentionally handled.

## Audit Method

- Compared direct dependencies in `client/package.json` and `server/package.json` against the npm registry using `npm outdated`.
- Read official release notes or migration docs where an upgrade could introduce behavior changes.
- Checked project-specific compatibility where semver alone was not enough, especially for the linting stack.

## Executive Summary

- The audited safe updates have been applied.
- The server direct dependency set is current after those updates.
- The remaining outdated direct dependencies are all intentional deferrals on the client side.
- The main upgrade that should **not** be applied automatically right now is `eslint` / `@eslint/js` v10.
- `@types/node` v25 is intentionally deferred because the project currently targets Node 20, and newer type definitions can expose runtime APIs that are not actually available in production.

## Client Audit

| Package | Current line in manifest | Latest registry version | Recommendation |
|---|---:|---:|---|
| `@eslint/js` | `^9.39.4` | `10.0.1` | Defer |
| `eslint` | `^9.39.1` | `10.0.2` | Defer |
| `eslint-plugin-react-refresh` | `^0.5.2` | `0.5.2` | Current |
| `globals` | `^17.4.0` | `17.4.0` | Current |
| `@types/node` | `^24.10.1` | `25.3.5` | Defer |

## Server Audit

| Package | Current line in manifest | Latest registry version | Recommendation |
|---|---:|---:|---|
| `@prisma/adapter-pg` | `^7.4.2` | `7.4.2` | Current |
| `@prisma/client` | `^7.4.2` | `7.4.2` | Current |
| `prisma` | `^7.4.2` | `7.4.2` | Current |
| `pg` | `^8.20.0` | `8.20.0` | Current |
| `resend` | `^6.9.3` | `6.9.3` | Current |
| `@types/multer` | `^2.1.0` | `2.1.0` | Current |
| `@types/pg` | `^8.18.0` | `8.18.0` | Current |
| `@types/supertest` | `^6.0.3` | `^6.0.3` installed; no remaining action from current audit | Current for this repo |

## Applied Safe Updates

The following direct dependency updates were applied during this audit:

### Client

- `eslint-plugin-react-refresh` from `^0.4.24` to `^0.5.2`
- `globals` from `^16.5.0` to `^17.4.0`
- `@eslint/js` within major 9 to `^9.39.4`

### Server

- `@prisma/adapter-pg` from `^7.4.1` to `^7.4.2`
- `@prisma/client` from `^7.4.1` to `^7.4.2`
- `prisma` from `^7.4.1` to `^7.4.2`
- `pg` from `^8.18.0` to `^8.20.0`
- `resend` from `^6.9.2` to `^6.9.3`
- `@types/multer` from `^2.0.0` to `^2.1.0`
- `@types/pg` from `^8.16.0` to `^8.18.0`

## Breaking Changes and Upgrade Notes

### 1. ESLint 10 and `@eslint/js` 10

**Official sources reviewed**

- `https://eslint.org/docs/latest/use/migrate-to-10.0.0`
- `https://github.com/eslint/eslint/releases/tag/v10.0.0`

**Documented breaking changes that matter here**

- ESLint 10 requires Node `>=20.19.0`, `>=22.13.0`, or `>=24`. The repo documentation currently says `Node.js 20+`, which is not strict enough for an ESLint 10 upgrade.
- The old `.eslintrc` config format is no longer supported. This repo already uses flat config in `client/eslint.config.js`, so that part is fine.
- `eslint:recommended` changed and can introduce new lint failures.
- JSX references are now tracked, which can change lint output in TSX files.
- `eslint-env` comments are now errors.
- The config lookup algorithm changed and can affect linting when commands are run from nested directories.

**Project-specific compatibility blocker**

- The current `eslint-plugin-react-hooks` release used by this repo declares peer support only through ESLint 9.
- `eslint-plugin-react-refresh` already supports ESLint 10, but the React Hooks plugin does not.

**Decision**

- Stay on ESLint 9 for now.
- Revisit only after the React Hooks plugin advertises ESLint 10 compatibility.

**What to do when upgrading later**

1. Raise the documented Node minimum to `20.19.0` or newer.
2. Update the lint stack together, not piecemeal.
3. Run a full lint pass and expect new reports from `eslint:recommended` and JSX reference tracking.
4. Remove any `eslint-env` comments if they appear in new files.

### 2. Prisma 7.4.2

**Official sources reviewed**

- `https://github.com/prisma/prisma/releases/tag/7.4.2`
- `https://www.prisma.io/changelog`

**Upstream notes**

- Prisma 7.4.2 is a patch release focused on bug fixes and quality improvements.
- The release notes do not call out any breaking changes.

**Project-specific impact**

- This repo is already on Prisma 7 and already uses the Prisma 7 architecture, including `prisma.config.ts`, generated client output, and `@prisma/adapter-pg`.
- Upgrading from `7.4.1` to `7.4.2` is low risk and should mainly deliver bug fixes.

**Decision**

- Safe to update together: `prisma`, `@prisma/client`, and `@prisma/adapter-pg`.

### 3. node-postgres `pg` 8.20.0

**Official sources reviewed**

- `https://www.npmjs.com/package/pg`
- `https://node-postgres.com/`

**Upstream notes**

- No official breaking-change release notes were published on the project releases page.
- The project describes itself as careful about backwards compatibility and publishes this as a same-major update.

**Project-specific impact**

- Treat this as a low-risk minor update.
- Because this backend uses PostgreSQL heavily, the right safety check is not just install success but a full build and test run after updating.

**Decision**

- Safe to update, but validate with backend tests.

### 4. Resend 6.9.3

**Official sources reviewed**

- `https://github.com/resend/resend-node/releases/tag/v6.9.3`

**Upstream notes**

- The release is a patch release.
- Notes mention exported response types, batch email option typing, and attachment type alignment.
- No breaking changes are called out.

**Project-specific impact**

- Runtime behavior risk is low.
- Type signatures may become slightly stricter, so email-related code should still be built after the upgrade.

**Decision**

- Safe to update.

### 5. `@types/node` 25

**Official source reviewed**

- `https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node`

**Why this is deferred**

- This is not a runtime library; it defines the TypeScript view of the Node API.
- The repo currently documents Node 20 as the baseline in both the client and server READMEs.
- Moving to Node 25 type definitions before moving the runtime baseline can create false confidence by exposing types for APIs not guaranteed in production.

**Decision**

- Keep Node types aligned with the actual runtime target, not the newest published major.

### 6. DefinitelyTyped package updates

This applies to `@types/multer`, `@types/pg`, and `@types/supertest`.

**Official source reviewed**

- DefinitelyTyped package homepages on GitHub

**Upgrade characteristics**

- These are type-only dependencies, so they do not change runtime behavior.
- Their main risk is stricter or corrected typings that can reveal previously hidden type mismatches.

**Project-specific decisions**

- `@types/multer` and `@types/pg` can be treated as safe updates.
- `@types/supertest` is deferred because it crosses a major boundary and should be taken only together with a full backend test/type validation pass.

## Remaining Deferred Upgrades

After applying the safe updates, the remaining intentionally deferred direct dependency upgrades are:

- `@eslint/js` 10.x
- `eslint` 10.x
- `@types/node` 25.x

## Validation Checklist After Applying Safe Updates

### Client

1. Run `npm run lint`.
2. Run `npm run type-check`.
3. Verify the Vite app still starts.

### Server

1. Run `npm run build`.
2. Run `npm test`.
3. Regenerate Prisma client if needed with `npx prisma generate`.

## Deferred Upgrades to Revisit Later

- `eslint` 10 / `@eslint/js` 10
- `@types/node` 25

These are deferred on purpose. Deferring them is the recommended practice for this repo right now, because they either introduce documented breaking changes or can create avoidable compatibility churn.