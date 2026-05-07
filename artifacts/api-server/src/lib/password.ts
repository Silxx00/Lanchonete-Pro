import bcrypt from "bcryptjs";
import { createHash } from "crypto";

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.length === 64 && !hash.startsWith("$2")) {
    const legacy = createHash("sha256").update(password + "nova-era-salt").digest("hex");
    return legacy === hash;
  }
  return bcrypt.compare(password, hash);
}

export function legacyHash(password: string): string {
  return createHash("sha256").update(password + "nova-era-salt").digest("hex");
}
