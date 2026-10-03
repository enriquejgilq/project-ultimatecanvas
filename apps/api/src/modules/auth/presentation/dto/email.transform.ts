import { Transform } from 'class-transformer';

/** Same normalization as the domain (trim + lowercase) before validation. */
export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
