import fs from "node:fs";
import path from "node:path";

/** True when a file exists under `public/`. Safe to call from server components. */
export function publicFileReady(publicPath: string): boolean {
  const relative = publicPath.replace(/^\/+/, "");
  return fs.existsSync(path.join(process.cwd(), "public", relative));
}

export function blogImagePath(file: string): string {
  return `/images/blog/${file}`;
}
