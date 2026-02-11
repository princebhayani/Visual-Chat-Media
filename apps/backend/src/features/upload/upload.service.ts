import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { cloudinary, isCloudinaryEnabled } from '../../config/cloudinary';

const UPLOAD_FOLDER = 'ai-chat-attachments';

// Allowed MIME types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

// Size limits per type (in bytes)
const SIZE_LIMITS: Record<string, number> = {
  image: 10 * 1024 * 1024,  // 10 MB
  video: 50 * 1024 * 1024,  // 50 MB
  audio: 25 * 1024 * 1024,  // 25 MB
  default: 25 * 1024 * 1024, // 25 MB
};

function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'default';
}

function getResourceType(mimeType: string): 'image' | 'video' | 'raw' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
  return 'raw';
}

const MIME_TO_FORMAT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'application/pdf': 'pdf',
};

// Multer memory storage - files kept in memory for Cloudinary upload
const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Max 50MB
  },
});

/**
 * Generate thumbnail URL for Cloudinary assets.
 * Images: 200x200 crop; Videos: first frame.
 */
function getCloudinaryThumbnailUrl(
  secureUrl: string,
  resourceType: string,
  publicId: string
): string | null {
  if (resourceType === 'raw') return null;

  try {
    const url = new URL(secureUrl);
    const pathParts = url.pathname.split('/');
    // Cloudinary path: /v{version}/{public_id}.{format} or /{public_id}.{format}
    const uploadIdx = pathParts.indexOf('upload');
    if (uploadIdx === -1) return null;

    // Insert transformation after 'upload'
    // For videos: so_0 = first frame, f_jpg = output as image
    const transformation =
      resourceType === 'image'
        ? 'w_200,h_200,c_fill'
        : 'so_0,w_200,h_200,c_fill,f_jpg';
    pathParts.splice(uploadIdx + 1, 0, transformation);
    url.pathname = pathParts.join('/');

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Upload file buffer to Cloudinary and return URLs.
 */
async function uploadToCloudinary(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<{
  fileUrl: string;
  thumbnailUrl: string | null;
  width?: number;
  height?: number;
}> {
  if (!isCloudinaryEnabled) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  const resourceType = getResourceType(mimeType);
  const format = MIME_TO_FORMAT[mimeType] || path.extname(originalName).slice(1) || 'bin';
  const ext = path.extname(originalName) || `.${format}`;
  const publicId =
    resourceType === 'raw'
      ? `${UPLOAD_FOLDER}/${randomUUID()}${ext}`
      : `${UPLOAD_FOLDER}/${randomUUID()}`;

  const uploadOptions: Record<string, unknown> = {
    resource_type: resourceType,
    public_id: publicId,
    ...(resourceType !== 'raw' && { format }),
  };

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }
        if (!result) {
          reject(new Error('Cloudinary upload returned no result'));
          return;
        }

        const secureUrl = result.secure_url;
        const thumbnailUrl = getCloudinaryThumbnailUrl(
          secureUrl,
          resourceType,
          result.public_id
        );

        const dimensions: { width?: number; height?: number } = {};
        if (result.width && result.height) {
          dimensions.width = result.width;
          dimensions.height = result.height;
        }

        resolve({
          fileUrl: secureUrl,
          thumbnailUrl,
          ...dimensions,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

// Process uploaded file
export async function processUpload(file: Express.Multer.File) {
  if (!file.buffer) {
    throw new Error('File buffer is missing (expected memory storage)');
  }

  const category = getFileCategory(file.mimetype);
  const sizeLimit = SIZE_LIMITS[category];

  if (file.size > sizeLimit) {
    throw new Error(
      `File too large. ${category} files must be under ${Math.round(sizeLimit / (1024 * 1024))}MB`
    );
  }

  const { fileUrl, thumbnailUrl, width, height } = await uploadToCloudinary(
    file.buffer,
    file.mimetype,
    file.originalname
  );

  return {
    fileUrl,
    thumbnailUrl,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    ...(width && height ? { width, height } : {}),
  };
}
