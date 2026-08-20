const SCRIPT_RE = /<script[\s\S]*?<\/script>/gi;
const FOREIGN_OBJECT_RE = /<foreignObject[\s\S]*?<\/foreignObject>/gi;
const EVENT_ATTR_RE = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

export function isSvgFile(fileName: string, mimeType: string): boolean {
  const mime = mimeType.toLowerCase();
  return (
    mime === "image/svg+xml" ||
    mime === "image/svg" ||
    fileName.toLowerCase().endsWith(".svg")
  );
}

export function sanitizeSvg(buffer: Buffer): Buffer {
  const text = buffer.toString("utf8");
  if (!/<svg[\s>]/i.test(text)) {
    throw new Error("invalid-svg");
  }
  const cleaned = text
    .replace(SCRIPT_RE, "")
    .replace(FOREIGN_OBJECT_RE, "")
    .replace(EVENT_ATTR_RE, "")
    .replace(/javascript:/gi, "");
  return Buffer.from(cleaned, "utf8");
}
