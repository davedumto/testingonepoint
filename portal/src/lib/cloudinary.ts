import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

let configured = false;

function configure() {
  if (configured) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in env.');
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
}

export function isCloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export interface UploadOptions {
  folder: string;
  publicId?: string;
  transformation?: Record<string, unknown>[];
}

// Uploads a buffer (e.g. from a multipart file) via Cloudinary's SDK. Returns the
// UploadApiResponse. We proxy uploads through our server so credentials never
// reach the client and every upload passes through our validation chokepoint.
export function uploadBuffer(buffer: Buffer, opts: UploadOptions): Promise<UploadApiResponse> {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder,
        public_id: opts.publicId,
        resource_type: 'image',
        overwrite: true,
        transformation: opts.transformation,
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed.'));
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  configure();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}
