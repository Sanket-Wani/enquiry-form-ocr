import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const STORAGE_DIR = path.join(process.cwd(), "storage", "documents");

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB per Sarvam DocAI limit

export interface SavedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  absolutePath: string;
}

export function validateDocumentFile(mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file format (${mimeType}). Allowed formats are PNG, JPEG, and PDF as supported by Sarvam DocAI.`,
    };
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 50MB maximum limit supported by Sarvam DocAI (${(sizeBytes / (1024 * 1024)).toFixed(1)}MB uploaded).`,
    };
  }

  return { valid: true };
}

export async function saveDocumentFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<SavedFile> {
  const validation = validateDocumentFile(mimeType, buffer.length);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = path.extname(originalFilename) || (mimeType === "application/pdf" ? ".pdf" : ".png");
  const uniqueName = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
  const targetPath = path.join(STORAGE_DIR, uniqueName);

  await fs.promises.writeFile(targetPath, buffer);

  return {
    filename: uniqueName,
    originalName: originalFilename,
    mimeType,
    sizeBytes: buffer.length,
    relativePath: path.join("storage", "documents", uniqueName),
    absolutePath: targetPath,
  };
}

export function getDocumentAbsolutePath(relativePathOrFilename: string): string {
  const filename = path.basename(relativePathOrFilename);
  return path.join(process.cwd(), "storage", "documents", filename);
}

export async function readDocumentFile(relativePathOrFilename: string): Promise<Buffer> {
  const filePath = getDocumentAbsolutePath(relativePathOrFilename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Document file not found at ${filePath}`);
  }
  return fs.promises.readFile(filePath);
}
