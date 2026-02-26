import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const cloudinaryService = {
  async uploadImage(buffer: Buffer, folder: string): Promise<{ url: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "image" },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Failed to upload image"));
            return;
          }

          resolve({ url: result.secure_url });
        }
      );

      uploadStream.end(buffer);
    });
  },
};
