import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_VERSION = "v1";
const PREFIX = `${KEY_VERSION}:`;

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  if (hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex characters (32 bytes).",
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Check if a string is already encrypted (has version prefix).
 */
export function isEncrypted(data: string): boolean {
  return data.startsWith(PREFIX);
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Format: v1:[iv_hex]:[authTag_hex]:[ciphertext_base64]
 */
export function encryptFormData(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt ciphertext encrypted with encryptFormData.
 * Supports lazy migration: returns plaintext as-is if not encrypted.
 */
export function decryptFormData(ciphertext: string): string {
  // Lazy migration: if not encrypted, return as-is
  if (!isEncrypted(ciphertext)) {
    return ciphertext;
  }

  const key = getEncryptionKey();

  // Strip prefix and parse components
  const withoutPrefix = ciphertext.slice(PREFIX.length);
  const parts = withoutPrefix.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format.");
  }

  const [ivHex, authTagHex, ciphertextBase64] = parts;
  const iv = Buffer.from(ivHex!, "hex");
  const authTag = Buffer.from(authTagHex!, "hex");
  const encrypted = Buffer.from(ciphertextBase64!, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
