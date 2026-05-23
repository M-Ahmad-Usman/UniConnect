import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";
import { ValidationError } from "../shared/errors/index.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const ALLOWED_UPLOAD_FOLDERS = new Set([
  "profile-pictures",
  "post-attachments",
  "server-icons",
]);

export type CloudinaryUploadFolder =
  | "profile-pictures"
  | "post-attachments"
  | "server-icons";

export const cloudinaryService = {
  async uploadImage(
    buffer: Buffer,
    folder: CloudinaryUploadFolder,
  ): Promise<{ url: string }> {
    if (!ALLOWED_UPLOAD_FOLDERS.has(folder)) {
      throw new ValidationError("Upload folder is not allowed");
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "image" },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Failed to upload image"));
            return;
          }

          resolve({ url: result.secure_url });
        },
      );

      uploadStream.end(buffer);
    });
  },
};
