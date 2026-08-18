import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/** Characters used for generated temp passwords (no ambiguous 0/O/1/l/I). */
const TEMP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const TEMP_SPECIALS = '@#$%&*';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Generates a readable temporary password (letters + digits + one special),
 * returned once to the provisioner. Uses crypto for unbiased selection.
 */
export function generateTempPassword(length = 12): string {
  const pick = (chars: string) => chars[randomInt(0, chars.length)];

  const body = Array.from({ length: length - 1 }, () => pick(TEMP_ALPHABET)).join('');
  // Ensure at least one special char for password-policy friendliness.
  const special = pick(TEMP_SPECIALS);
  const insertAt = randomInt(0, body.length + 1);
  return body.slice(0, insertAt) + special + body.slice(insertAt);
}
