import { z } from "zod";

import { fieldErrorsFromZod } from "./querySchemas.js";

/**
 * Contact-form validation (public POST /api/contact).
 *
 * The endpoint is anonymous, so validation is deliberately strict and the
 * payload small: name / email / subject / message bounds, plus a hidden
 * "company" honeypot field (bots fill it; the form never renders it
 * visibly). Honeypot submissions get a success-shaped response WITHOUT any
 * database write — silent drop, no oracle for the spammer.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const contactMessageSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter your name (at least 2 characters).")
      .max(120, "Name must be at most 120 characters."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(5, "Enter your email address.")
      .max(254, "Email must be at most 254 characters.")
      .regex(EMAIL_PATTERN, "Enter a valid email address."),
    subject: z
      .string()
      .trim()
      .min(2, "Enter a subject.")
      .max(150, "Subject must be at most 150 characters."),
    message: z
      .string()
      .trim()
      .min(10, "Your message must be at least 10 characters.")
      .max(4000, "Message must be at most 4000 characters."),
    /** Honeypot — must stay EMPTY. Human users never see this field. */
    company: z.string().max(200).optional(),
  })
  .strict();

export function contactFieldErrors(error: z.ZodError): Record<string, string> {
  return fieldErrorsFromZod(error);
}

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
