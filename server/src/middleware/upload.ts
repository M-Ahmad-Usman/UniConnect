import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { MAX_FILE_SIZE } from "../shared/constants.js";
import { ValidationError } from "../shared/errors/index.js";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_CSV_TYPES = ["text/csv", "application/vnd.ms-excel", "text/plain"];

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
  next: NextFunction
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
  imageUpload.single("profilePicture")
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
