import { compare, hash } from 'bcryptjs';

const SALT_ROUNDS = 10;

/** Hash a plaintext password using bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

/** Verify a plaintext password against a stored hash. */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}
