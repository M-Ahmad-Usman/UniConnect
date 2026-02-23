/**
 * Jest setup file.
 *
 * Environment variables are loaded by the npm script via `dotenv -e .env.test`
 * before Jest starts, so process.env already contains the test environment values.
 *
 * This file runs before each test suite via Jest's `setupFiles` option.
 * Note: Jest lifecycle hooks (beforeAll/afterAll) are NOT available here.
 * Each test file manages its own Prisma connection lifecycle.
 */

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = "test";

