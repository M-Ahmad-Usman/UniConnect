import { z } from "zod";
import { ValidationError } from "../errors/index.js";

const MAX_POSTGRES_INT = 2_147_483_647;
const PUBLIC_ID_ERROR = "Public ID must be a UUIDv7 string";
const INTERNAL_ID_ERROR = "Internal ID must be a positive integer";

export const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare const publicIdBrand: unique symbol;

export type PublicId = string & { readonly [publicIdBrand]: true };

export const publicIdSchema = z
  .string({ error: "Public ID must be a string" })
  .trim()
  .toLowerCase()
  .regex(UUID_V7_PATTERN, { error: PUBLIC_ID_ERROR })
  .transform((value) => value as PublicId);

export function isPublicId(value: unknown): value is PublicId {
  return publicIdSchema.safeParse(value).success;
}

export function parsePublicId(value: unknown, field = "publicId"): PublicId {
  const result = publicIdSchema.safeParse(value);

  if (!result.success) {
    throw new ValidationError("Invalid public ID", [
      {
        field,
        message: PUBLIC_ID_ERROR,
      },
    ]);
  }

  return result.data;
}

export function isInternalId(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 && value <= MAX_POSTGRES_INT;
  }

  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return false;
  }

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed <= MAX_POSTGRES_INT;
}

export function parseInternalId(value: unknown, field = "id"): number {
  if (!isInternalId(value)) {
    throw new ValidationError("Invalid internal ID", [
      {
        field,
        message: INTERNAL_ID_ERROR,
      },
    ]);
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value.trim());
  }

  throw new ValidationError("Invalid internal ID", [
    {
      field,
      message: INTERNAL_ID_ERROR,
    },
  ]);
}
