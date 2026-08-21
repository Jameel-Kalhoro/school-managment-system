import { Transform } from 'class-transformer';

/**
 * Canonicalizes an email field to trimmed lowercase during transformation, so
 * emails are stored and matched case-insensitively across the app. Runs under
 * the global ValidationPipe (transform: true) before @IsEmail validation.
 */
export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
