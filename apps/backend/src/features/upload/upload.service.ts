import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });

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

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

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
    fileSize: 50 * 1024 * 1024, // Max 50MB (per-type checking done in service)
  },
});

// Generate thumbnail for images
export async function generateThumbnail(
  filePath: string,
  mimeType: string,
): Promise<string | null> {
  if (!mimeType.startsWith('image/') || mimeType === 'image/svg+xml') {
    return null;
  }

  try {
    const fileName = path.basename(filePath);
    const thumbName = `thumb_${fileName.replace(path.extname(fileName), '.jpg')}`;
    const thumbPath = path.join(THUMB_DIR, thumbName);

    await sharp(filePath)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);

    return `/uploads/thumbnails/${thumbName}`;
  } catch {
    return null;
  }
}

// Get image dimensions
export async function getImageDimensions(
  filePath: string,
  mimeType: string,
): Promise<{ width: number; height: number } | null> {
  if (!mimeType.startsWith('image/') || mimeType === 'image/svg+xml') {
    return null;
  }

  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } catch {
    return null;
  }
}

// Process uploaded file
export async function processUpload(file: Express.Multer.File) {
  const category = getFileCategory(file.mimetype);
  const sizeLimit = SIZE_LIMITS[category];

  if (file.size > sizeLimit) {
    // Clean up the uploaded file
    fs.unlinkSync(file.path);
    throw new Error(
      `File too large. ${category} files must be under ${Math.round(sizeLimit / (1024 * 1024))}MB`,
    );
  }

  const fileUrl = `/uploads/${file.filename}`;
  const thumbnailUrl = await generateThumbnail(file.path, file.mimetype);
  const dimensions = await getImageDimensions(file.path, file.mimetype);

  return {
    fileUrl,
    thumbnailUrl,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
  };
}
