import sharp from 'sharp';
import { AppError } from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_DIMENSION = 50;
const MAX_DIMENSION = 4096;
const ALLOWED_FORMATS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

export async function validateImage(base64Data: string): Promise<Buffer> {
  // Remove data URL prefix if present
  const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');

  // Decode base64
  const buffer = Buffer.from(base64String, 'base64');

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new AppError(400, `Image too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Get image metadata
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (error) {
    throw new AppError(400, 'Invalid image file');
  }

  // Check format
  if (!metadata.format || !ALLOWED_FORMATS.includes(metadata.format)) {
    throw new AppError(400, `Invalid image format. Allowed: ${ALLOWED_FORMATS.join(', ')}`);
  }

  // Check dimensions
  if (!metadata.width || !metadata.height) {
    throw new AppError(400, 'Could not determine image dimensions');
  }

  if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
    throw new AppError(400, `Image too small. Minimum dimensions: ${MIN_DIMENSION}x${MIN_DIMENSION}px`);
  }

  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    throw new AppError(400, `Image too large. Maximum dimensions: ${MAX_DIMENSION}x${MAX_DIMENSION}px`);
  }

  return buffer;
}

