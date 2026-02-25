import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomBytes } from "node:crypto";

// Generate a test key before importing the module
const TEST_KEY = randomBytes(32).toString("hex");

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterAll(() => {
  delete process.env.ENCRYPTION_KEY;
});

// Dynamic import after env is set
async function getCrypto() {
  // Clear module cache to pick up new env
  const mod = await import("../crypto.server");
  return mod;
}

describe("crypto.server", () => {
  it("encrypts and decrypts roundtrip", async () => {
    const { encryptFormData, decryptFormData } = await getCrypto();
    const plaintext = JSON.stringify({ companyName: "テスト株式会社", email: "test@example.com" });

    const encrypted = encryptFormData(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.startsWith("v1:")).toBe(true);

    const decrypted = decryptFormData(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces unique IVs for each encryption", async () => {
    const { encryptFormData } = await getCrypto();
    const plaintext = "same data";

    const encrypted1 = encryptFormData(plaintext);
    const encrypted2 = encryptFormData(plaintext);

    // Same plaintext should produce different ciphertexts (different IVs)
    expect(encrypted1).not.toBe(encrypted2);

    // Extract IVs and verify they differ
    const iv1 = encrypted1.split(":")[1];
    const iv2 = encrypted2.split(":")[1];
    expect(iv1).not.toBe(iv2);
  });

  it("isEncrypted detects encrypted vs plaintext", async () => {
    const { encryptFormData, isEncrypted } = await getCrypto();

    const plaintext = '{"key": "value"}';
    expect(isEncrypted(plaintext)).toBe(false);

    const encrypted = encryptFormData(plaintext);
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it("decryptFormData handles plaintext via lazy migration", async () => {
    const { decryptFormData } = await getCrypto();
    const plaintext = '{"companyName": "テスト"}';

    // Plaintext should be returned as-is (lazy migration)
    const result = decryptFormData(plaintext);
    expect(result).toBe(plaintext);
  });

  it("fails decryption with wrong key", async () => {
    const { encryptFormData } = await getCrypto();
    const plaintext = "secret data";
    const encrypted = encryptFormData(plaintext);

    // Change the key
    const origKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");

    // Re-import with new key - use dynamic function
    const { decryptFormData: decryptWithWrongKey } = await getCrypto();

    expect(() => decryptWithWrongKey(encrypted)).toThrow();

    // Restore
    process.env.ENCRYPTION_KEY = origKey;
  });

  it("fails with invalid format", async () => {
    const { decryptFormData } = await getCrypto();
    expect(() => decryptFormData("v1:invalid")).toThrow("Invalid encrypted data format");
  });

  it("handles empty string plaintext", async () => {
    const { encryptFormData, decryptFormData } = await getCrypto();
    const encrypted = encryptFormData("");
    expect(decryptFormData(encrypted)).toBe("");
  });

  it("handles large payloads", async () => {
    const { encryptFormData, decryptFormData } = await getCrypto();
    const large = "あ".repeat(50000);
    const encrypted = encryptFormData(large);
    expect(decryptFormData(encrypted)).toBe(large);
  });

  it("throws if ENCRYPTION_KEY is missing", async () => {
    const origKey = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;

    const { encryptFormData } = await getCrypto();
    expect(() => encryptFormData("test")).toThrow("ENCRYPTION_KEY environment variable is required");

    process.env.ENCRYPTION_KEY = origKey;
  });

  it("throws if ENCRYPTION_KEY has wrong length", async () => {
    const origKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "tooshort";

    const { encryptFormData } = await getCrypto();
    expect(() => encryptFormData("test")).toThrow("64 hex characters");

    process.env.ENCRYPTION_KEY = origKey;
  });
});
