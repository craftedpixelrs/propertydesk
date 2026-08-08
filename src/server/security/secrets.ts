import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { serverEnv } from "@/lib/env";

/**
 * Server-side secrets-at-rest helper.
 *
 * Encrypts sensitive fields (currently the Serbian SEF API key) using
 * AES-256-GCM. The ciphertext is stored as a self-describing base64 blob:
 *
 *   `v1.<iv-base64>.<tag-base64>.<ciphertext-base64>`
 *
 * The `v1` prefix lets us evolve the format later without breaking existing
 * rows. Any consumer that reads secrets from the DB MUST go through this
 * module — never store or log the plaintext.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM standard
const TAG_LEN = 16; // GCM auth tag

let cachedKey: Buffer | null = null;

function deriveDevKey(): Buffer {
  // Deterministic 32-byte key derived from BETTER_AUTH_SECRET. Only used when
  // BILLING_SECRET_KEY is missing (dev / test) so encryption still works
  // without extra environment setup. Production requires an explicit key.
  const source = serverEnv.BETTER_AUTH_SECRET ?? "propertydesk-dev";
  return createHash("sha256")
    .update(`billing-key/${source}`, "utf8")
    .digest();
}

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = serverEnv.BILLING_SECRET_KEY;
  if (raw && raw.trim().length > 0) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) {
      throw new Error(
        `BILLING_SECRET_KEY must decode to exactly 32 bytes; got ${buf.length}`,
      );
    }
    cachedKey = buf;
    return cachedKey;
  }
  if (serverEnv.NODE_ENV === "production") {
    throw new Error(
      "BILLING_SECRET_KEY is required in production. Set it to a base64-encoded 32-byte value.",
    );
  }
  cachedKey = deriveDevKey();
  return cachedKey;
}

/**
 * Encrypt a plaintext string. Returns a self-describing base64 blob.
 * Empty / null input returns null so callers can pass-through cleared values.
 */
export function encryptSecret(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return null;
  const key = loadKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

/**
 * Decrypt a value previously produced by `encryptSecret`. Returns null when
 * input is null / empty so callers can safely propagate "not set".
 * Throws on tampered / malformed ciphertext.
 */
export function decryptSecret(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  const parts = ciphertext.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Malformed billing secret ciphertext");
  }
  const [, ivB64, tagB64, encB64] = parts;
  if (!ivB64 || !tagB64 || !encB64) {
    throw new Error("Malformed billing secret ciphertext (missing components)");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error("Malformed billing secret ciphertext (bad iv/tag length)");
  }
  const key = loadKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * Return a masked, human-readable preview of a stored secret for admin UIs.
 * Never returns the plaintext — always shows only a fixed-width dot mask.
 */
export function maskSecret(ciphertext: string | null | undefined): string {
  if (!ciphertext) return "";
  return "••••••••••••";
}

/**
 * Generate a fresh base64-encoded 32-byte key. Useful for `openssl rand -base64 32`
 * equivalents at runtime (e.g. seed / provisioning scripts).
 */
export function generateBillingSecretKey(): string {
  return randomBytes(32).toString("base64");
}
