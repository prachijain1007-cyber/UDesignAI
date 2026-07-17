import path from "path";
import { readFile } from "fs/promises";

/** Reads a file referenced by a local `/uploads/...` URL or a remote http(s) URL. */
export async function fetchFileBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", url);
    return readFile(filePath);
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch file at ${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
