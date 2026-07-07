-- Phase 1 redesign foundation: persisted STAFF base type and staff-role scopes.
-- PostgreSQL requires newly added enum values to commit before later migrations
-- can use them in constraints, inserts, or partial predicates.

ALTER TYPE "user_type" RENAME VALUE 'Admin' TO 'Staff';

ALTER TYPE "platform_role_scope_type" ADD VALUE 'department';
ALTER TYPE "platform_role_scope_type" ADD VALUE 'global';
