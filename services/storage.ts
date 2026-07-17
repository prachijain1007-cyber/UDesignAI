import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface StoredFile {
  url: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

let s3Client: S3Client | null = null;
function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({ region: process.env.S3_REGION });
  }
  return s3Client;
}

function safeExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{2,5}$/.test(ext) ? ext : "";
}

async function saveLocal(buffer: Buffer, filename: string, mimeType: string): Promise<StoredFile> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const key = `${randomUUID()}${safeExtension(filename)}`;
  await writeFile(path.join(UPLOAD_DIR, key), buffer);
  return { url: `/uploads/${key}`, storageKey: key, mimeType, sizeBytes: buffer.byteLength };
}

async function saveToS3(buffer: Buffer, filename: string, mimeType: string): Promise<StoredFile> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not configured");

  const key = `room-uploads/${randomUUID()}${safeExtension(filename)}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const publicBase = process.env.S3_PUBLIC_URL ?? `https://${bucket}.s3.amazonaws.com`;
  return { url: `${publicBase}/${key}`, storageKey: key, mimeType, sizeBytes: buffer.byteLength };
}

export async function saveUploadedFile(file: File): Promise<StoredFile> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const driver = process.env.STORAGE_DRIVER ?? "local";

  if (driver === "s3") {
    return saveToS3(buffer, file.name, file.type || "application/octet-stream");
  }
  return saveLocal(buffer, file.name, file.type || "application/octet-stream");
}
