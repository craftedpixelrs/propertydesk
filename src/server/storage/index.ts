import "server-only";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { serverEnv } from "@/lib/env";
import { logger } from "@/server/logger";
import { DomainError } from "@/lib/errors";

/**
 * Object-storage abstraction.
 *
 * Two backends:
 *   - `local` — writes files under `STORAGE_LOCAL_DIR`. Used in dev/self-host
 *               where no S3-compatible bucket is configured.
 *   - `s3`    — writes to any S3-compatible service (AWS S3, Cloudflare R2,
 *               Backblaze B2, MinIO, ...). Uses V4 signed URLs.
 *
 * Callers should treat `storageKey` as an opaque identifier and never
 * assume its shape.
 */

export interface PutObjectInput {
  organizationId: string;
  category: string;
  fileName: string;
  contentType: string;
  body: Buffer | Uint8Array;
}

export interface PutObjectResult {
  storageKey: string;
  size: number;
  checksum: string;
}

export interface StorageProvider {
  put(input: PutObjectInput): Promise<PutObjectResult>;
  getSignedUrl(storageKey: string, expiresInSec?: number): Promise<string>;
  delete(storageKey: string): Promise<void>;
  read(storageKey: string): Promise<Buffer>;
}

// -----------------------------------------------------------------------------
// Local filesystem provider (dev + single-node self-host).
// -----------------------------------------------------------------------------

class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolvePath(storageKey: string): string {
    // Reject path traversal attempts.
    const normalized = path.normalize(storageKey).replace(/^([/\\]+)/, "");
    if (normalized.includes("..")) {
      throw new DomainError("BAD_REQUEST", "Nevalidan ključ datoteke.");
    }
    return path.join(this.root, normalized);
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const ext = extractExtension(input.fileName);
    const random = randomBytes(12).toString("hex");
    const storageKey = [
      "orgs",
      input.organizationId,
      input.category,
      `${new Date().toISOString().slice(0, 10)}_${random}${ext}`,
    ].join("/");

    const target = this.resolvePath(storageKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, input.body);

    const checksum = createHash("sha256").update(input.body).digest("hex");
    return {
      storageKey,
      size: input.body.byteLength,
      checksum,
    };
  }

  async getSignedUrl(storageKey: string): Promise<string> {
    // Local backend has no notion of signed URLs. Callers must stream the
    // file themselves through an authenticated route (e.g. /api/v1/documents/:id/download).
    return `local:${storageKey}`;
  }

  async delete(storageKey: string): Promise<void> {
    const target = this.resolvePath(storageKey);
    await fs.rm(target, { force: true });
  }

  async read(storageKey: string): Promise<Buffer> {
    const target = this.resolvePath(storageKey);
    return await fs.readFile(target);
  }
}

// -----------------------------------------------------------------------------
// S3-compatible provider (uses AWS SDK if installed; otherwise falls back).
// -----------------------------------------------------------------------------

class S3StorageProvider implements StorageProvider {
  private clientPromise: Promise<{
    client: unknown;
    presigner: (client: unknown, cmd: unknown, opts: unknown) => Promise<string>;
    lib: Record<string, unknown>;
  } | null> | null = null;

  private async loadClient() {
    if (this.clientPromise) return this.clientPromise;
    this.clientPromise = (async () => {
      try {
        // Use runtime-only imports (string variables) so TypeScript doesn't
        // require the AWS SDK to be installed just to type-check. The S3
        // provider is optional and only activated when STORAGE_PROVIDER=s3.
        const s3Path = "@aws-sdk/client-s3";
        const presignPath = "@aws-sdk/s3-request-presigner";
        const s3Mod = (await import(
          /* webpackIgnore: true */ s3Path
        ).catch(() => null)) as Record<string, unknown> | null;
        const presignMod = (await import(
          /* webpackIgnore: true */ presignPath
        ).catch(() => null)) as Record<string, unknown> | null;
        if (!s3Mod || !presignMod) return null;

        const S3Client = s3Mod.S3Client as new (opts: unknown) => unknown;
        const client = new S3Client({
          region: serverEnv.STORAGE_REGION ?? "auto",
          endpoint: serverEnv.STORAGE_ENDPOINT,
          credentials:
            serverEnv.STORAGE_ACCESS_KEY && serverEnv.STORAGE_SECRET_KEY
              ? {
                  accessKeyId: serverEnv.STORAGE_ACCESS_KEY,
                  secretAccessKey: serverEnv.STORAGE_SECRET_KEY,
                }
              : undefined,
          forcePathStyle: Boolean(serverEnv.STORAGE_ENDPOINT),
        });
        return {
          client,
          presigner: presignMod.getSignedUrl as (
            client: unknown,
            cmd: unknown,
            opts: unknown,
          ) => Promise<string>,
          lib: s3Mod,
        };
      } catch (err) {
        logger.warn("S3 SDK not available; falling back to local", {
          error: (err as Error)?.message,
        });
        return null;
      }
    })();
    return this.clientPromise;
  }

  private ensureBucket(): string {
    const bucket = serverEnv.STORAGE_BUCKET;
    if (!bucket) {
      throw new DomainError(
        "INTERNAL",
        "STORAGE_BUCKET nije konfigurisan.",
      );
    }
    return bucket;
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const sdk = await this.loadClient();
    if (!sdk) {
      throw new DomainError(
        "INTERNAL",
        "S3 SDK nije dostupan. Instalirajte @aws-sdk/client-s3.",
      );
    }
    const bucket = this.ensureBucket();
    const ext = extractExtension(input.fileName);
    const random = randomBytes(12).toString("hex");
    const storageKey = [
      "orgs",
      input.organizationId,
      input.category,
      `${new Date().toISOString().slice(0, 10)}_${random}${ext}`,
    ].join("/");

    const PutObjectCommand = sdk.lib.PutObjectCommand as new (o: unknown) => unknown;
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: input.body,
      ContentType: input.contentType,
    });
    await (sdk.client as { send: (cmd: unknown) => Promise<unknown> }).send(cmd);

    const checksum = createHash("sha256").update(input.body).digest("hex");
    return { storageKey, size: input.body.byteLength, checksum };
  }

  async getSignedUrl(storageKey: string, expiresInSec = 300): Promise<string> {
    const sdk = await this.loadClient();
    if (!sdk) throw new DomainError("INTERNAL", "S3 SDK nije dostupan.");
    const bucket = this.ensureBucket();
    const GetObjectCommand = sdk.lib.GetObjectCommand as new (o: unknown) => unknown;
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: storageKey });
    return sdk.presigner(sdk.client, cmd as unknown, { expiresIn: expiresInSec });
  }

  async delete(storageKey: string): Promise<void> {
    const sdk = await this.loadClient();
    if (!sdk) return;
    const bucket = this.ensureBucket();
    const DeleteObjectCommand = sdk.lib.DeleteObjectCommand as new (
      o: unknown,
    ) => unknown;
    const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: storageKey });
    await (sdk.client as { send: (cmd: unknown) => Promise<unknown> }).send(cmd);
  }

  async read(storageKey: string): Promise<Buffer> {
    const sdk = await this.loadClient();
    if (!sdk) throw new DomainError("INTERNAL", "S3 SDK nije dostupan.");
    const bucket = this.ensureBucket();
    const GetObjectCommand = sdk.lib.GetObjectCommand as new (o: unknown) => unknown;
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: storageKey });
    const res = (await (
      sdk.client as { send: (cmd: unknown) => Promise<{ Body?: unknown }> }
    ).send(cmd)) as { Body?: { transformToByteArray?: () => Promise<Uint8Array> } };
    const body = res.Body;
    if (!body?.transformToByteArray) {
      throw new DomainError("INTERNAL", "Neispravan odgovor storage sloja.");
    }
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }
}

function extractExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return "";
  const ext = filename.slice(idx).toLowerCase();
  return /^\.[a-z0-9]{1,6}$/i.test(ext) ? ext : "";
}

let cached: StorageProvider | null = null;

export function storage(): StorageProvider {
  if (cached) return cached;
  cached =
    serverEnv.STORAGE_PROVIDER === "s3"
      ? new S3StorageProvider()
      : new LocalStorageProvider(serverEnv.STORAGE_LOCAL_DIR);
  return cached;
}

/** Test helper — clear the memoised provider between tests. */
export function _resetStorageForTests(): void {
  cached = null;
}

// -----------------------------------------------------------------------------
// MIME allowlist for document uploads. Additional categories can extend this
// list, but nothing outside the shared allowlist is ever accepted.
// -----------------------------------------------------------------------------

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set<string>([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

export function assertAllowedMimeType(mime: string): void {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mime)) {
    throw new DomainError(
      "BAD_REQUEST",
      "Ovaj tip datoteke nije podržan.",
    );
  }
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
