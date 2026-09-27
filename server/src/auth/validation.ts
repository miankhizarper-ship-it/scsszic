/**
 * Signup/login input validation — pure functions, no Express or React.
 *
 * Rules are deliberately humane (spec §10): a sensible password length,
 * no "bizarre complexity" theatre that pushes people toward reuse patterns.
 * Normalization happens here so every consumer (now the controller, later
 * any admin tooling) sees identical values.
 */

import type { ValidatedSignup } from "./types.js";
import { normalizeEmail, normalizeUsername } from "./userRepository.js";

export type FieldErrors = Record<string, string>;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;
export const DISPLAY_NAME_MAX = 60;

/** Letters, numbers, underscore, hyphen. No spaces or symbols. */
const USERNAME_PATTERN = /^[a-z0-9_-]+$/;
/** Pragmatic email shape: local@domain.tld (RFC-lite, standard for signups). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ValidationResult<T> {
  valid: boolean;
  /** Field → human-readable message (safe to show to the user). */
  errors: FieldErrors;
  /** Normalized values — only meaningful when `valid` is true. */
  values: T;
}

export function validateDisplayName(input: unknown): string | null {
  if (typeof input !== "string") return "Display name is required.";
  const value = input.trim();
  if (value.length < 2) return "Display name must be at least 2 characters.";
  if (value.length > DISPLAY_NAME_MAX) {
    return `Display name must be at most ${DISPLAY_NAME_MAX} characters.`;
  }
  return null;
}

export function validateUsername(input: unknown): string | null {
  if (typeof input !== "string") return "Username is required.";
  const value = normalizeUsername(input);
  if (value.length < USERNAME_MIN) {
    return `Username must be at least ${USERNAME_MIN} characters.`;
  }
  if (value.length > USERNAME_MAX) {
    return `Username must be at most ${USERNAME_MAX} characters.`;
  }
  if (!USERNAME_PATTERN.test(value)) {
    return "Use letters, numbers, hyphens, or underscores only.";
  }
  return null;
}

export function validateEmail(input: unknown): string | null {
  if (typeof input !== "string") return "Email is required.";
  const value = normalizeEmail(input);
  if (value.length > 254) return "Email is too long.";
  if (!EMAIL_PATTERN.test(value)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(input: unknown): string | null {
  if (typeof input !== "string") return "Password is required.";
  if (input.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  if (input.length > PASSWORD_MAX) {
    return `Password must be at most ${PASSWORD_MAX} characters.`;
  }
  return null;
}

/** Full signup validation with normalization. */
export function validateSignup(body: unknown): ValidationResult<ValidatedSignup> {
  const errors: FieldErrors = {};
  const b = (body ?? {}) as Record<string, unknown>;

  const displayNameError = validateDisplayName(b.displayName);
  if (displayNameError) errors.displayName = displayNameError;

  const usernameError = validateUsername(b.username);
  if (usernameError) errors.username = usernameError;

  const emailError = validateEmail(b.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(b.password);
  if (passwordError) errors.password = passwordError;

  if (typeof b.confirmPassword !== "string" || b.confirmPassword !== b.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: {
      displayName: typeof b.displayName === "string" ? b.displayName.trim() : "",
      username: typeof b.username === "string" ? normalizeUsername(b.username) : "",
      email: typeof b.email === "string" ? normalizeEmail(b.email) : "",
      password: typeof b.password === "string" ? b.password : "",
    },
  };
}

/**
 * Login accepts either an email or a username in the `identifier` field.
 * Both are normalized; the controller tries email first, then username.
 */
export function validateLogin(body: unknown): ValidationResult<{ identifier: string; password: string }> {
  const errors: FieldErrors = {};
  const b = (body ?? {}) as Record<string, unknown>;

  if (typeof b.identifier !== "string" || b.identifier.trim().length === 0) {
    errors.identifier = "Enter your email or username.";
  }
  const passwordError = validatePassword(b.password);
  if (passwordError) errors.password = passwordError;

  const identifier = typeof b.identifier === "string" ? b.identifier.trim() : "";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: {
      // Emails normalize lowercase; usernames are stored lowercase-unique too,
      // so one lowercase normalization is correct for both branches.
      identifier: identifier.toLowerCase(),
      password: typeof b.password === "string" ? b.password : "",
    },
  };
}
