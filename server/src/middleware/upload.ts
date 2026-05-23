import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { fileTypeFromBuffer } from "file-type";
import { imageSize } from "image-size";
import {
  MAX_ATTACHMENTS,
  MAX_FILE_SIZE,
  MAX_IMAGE_PIXELS,
} from "../shared/constants.js";
import { ValidationError } from "../shared/errors/index.js";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_CSV_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "text/plain",
];

function validateImageDimensions(buffer: Buffer): void {
  const dimensions = imageSize(buffer);
  if (!dimensions.width || !dimensions.height) {
    throw new ValidationError("Unable to determine image dimensions");
  }

  if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
    throw new ValidationError(
      "Image dimensions exceed the maximum allowed pixel count",
    );
  }
}

function handleUploadErrors(error: unknown): never {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      throw new ValidationError("File size exceeds maximum allowed size");
    }
    throw new ValidationError(error.message);
  }

  throw error;
}

type UploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

function wrapUpload(uploadMiddleware: UploadMiddleware) {
  return (req: Request, res: Response, next: NextFunction): void => {
    uploadMiddleware(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      try {
        handleUploadErrors(error);
      } catch (mappedError) {
        next(mappedError);
      }
    });
  };
}

// ─── Profile Picture Upload ────────────────────────────────────────────────

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new ValidationError("Only JPEG, PNG, and WEBP images are allowed"));
  },
});

export const uploadProfilePicture = wrapUpload(
  imageUpload.single("profilePicture"),
);

export const uploadServerIcon = wrapUpload(imageUpload.single("serverIcon"));

// ─── Post Attachments Upload ───────────────────────────────────────────────

export const uploadPostAttachments = wrapUpload(
  imageUpload.array("attachments", MAX_ATTACHMENTS),
);

// ─── CSV Upload ────────────────────────────────────────────────────────────

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const isCsvByExtension = file.originalname.toLowerCase().endsWith(".csv");
    if (isCsvByExtension || ALLOWED_CSV_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new ValidationError("Only CSV files are allowed"));
  },
});

export const uploadCSV = wrapUpload(csvUpload.single("file"));

// ─── Magic Bytes Validation ────────────────────────────────────────────────

/**
 * Validates that uploaded image files contain magic bytes matching an allowed
 * image MIME type. Rejects files where the actual content doesn't match.
 * Chain after multer on all image upload routes.
 */
export async function validateImageMagicBytes(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const files = req.files as Express.Multer.File[] | undefined;
  const file = req.file;
  const toValidate = files ?? (file ? [file] : []);

  for (const f of toValidate) {
    const detected = await fileTypeFromBuffer(f.buffer);
    if (!detected || !ALLOWED_IMAGE_TYPES.includes(detected.mime)) {
      throw new ValidationError(
        "File content does not match an allowed image type",
      );
    }

    validateImageDimensions(f.buffer);
  }

  next();
}

/**
 * Validates that an uploaded CSV file is not actually a binary format
 * (e.g. XLSX/XLS spoofed as CSV). True CSV files have no magic bytes,
 * so fileTypeFromBuffer returns undefined — which is the expected result.
 * Chain after multer on CSV upload routes.
 */
export async function validateCSVNotBinary(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const file = req.file;
  if (!file) {
    next();
    return;
  }

  const detected = await fileTypeFromBuffer(file.buffer);
  if (detected) {
    // A real CSV has no magic bytes — if we detect a binary format, reject it
    throw new ValidationError(
      "File appears to be a binary format, not a valid CSV",
    );
  }

  next();
}
