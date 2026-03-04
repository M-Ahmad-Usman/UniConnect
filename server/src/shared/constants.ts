// ─── Pagination ─────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

// ─── Posts ──────────────────────────────────────────────────────────────────
export const MAX_TITLE_LENGTH = 100;
export const MAX_CONTENT_LENGTH = 5000;
export const MAX_ATTACHMENTS = 3;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// ─── User ───────────────────────────────────────────────────────────────────
export const TEMP_PASSWORD_PREFIX = "TEMP_";

// ─── Security ───────────────────────────────────────────────────────────────
// OWASP recommends 12+. Existing bcrypt hashes remain compatible;
// they keep their original cost factor and verify correctly.
export const BCRYPT_ROUNDS = 12;
