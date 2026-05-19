import crypto from "crypto";
import env from "../config/env.ts";

/**
 * Reverses the frontend's AES-256-GCM login-password obfuscation so the
 * frontend `encryptPassword` util works unchanged. Plain values
 * (Swagger/Postman) pass through untouched.
 */
const ENC_PREFIX = "enc:v1:";
const getKey = (): Buffer =>
  crypto.createHash("sha256").update(env.passwordSecret).digest();

export const decryptPassword = (value: string): string => {
  if (!value || !value.startsWith(ENC_PREFIX)) return value;
  try {
    const packed = Buffer.from(value.slice(ENC_PREFIX.length), "base64");
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(packed.length - 16);
    const ciphertext = packed.subarray(12, packed.length - 16);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return value; // tampered/wrong key → auth simply fails downstream
  }
};
