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

export type CloudinaryUpload = {
  url: string;
  publicId: string;
};

export const cloudinaryService = {
  async uploadImage(
    buffer: Buffer,
    folder: CloudinaryUploadFolder,
  ): Promise<CloudinaryUpload> {
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

          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      uploadStream.end(buffer);
    });
  },

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  },
};

export async function cleanupCloudinaryUploads(
  uploads: CloudinaryUpload[],
): Promise<void> {
  const results = await Promise.allSettled(
    uploads.map((upload) => cloudinaryService.deleteImage(upload.publicId)),
  );
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn("[UPLOAD] Failed to clean up Cloudinary image", {
        publicId: uploads[index]?.publicId,
        error: result.reason,
      });
    }
  });
}
