import { randomUUID } from "node:crypto";

import { collections, type ContactMessageDoc } from "../../db/collections.js";
import { isConnectionError } from "../../db/errors.js";
import type { ContactMessageInput } from "../../http/contactSchemas.js";

/**
 * Contact repository — persists public contact-form submissions.
 *
 * There is intentionally NO public/admin read API in this phase: messages
 * are written once and read by the society directly in the database. The
 * write path stays minimal (single insert) and never exposes anything.
 */
class ContactRepository {
  async create(input: ContactMessageInput): Promise<void> {
    const doc: ContactMessageDoc = {
      _id: randomUUID(),
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
      createdAt: new Date().toISOString(),
    };
    try {
      await collections.contactMessages().insertOne(doc);
    } catch (error) {
      if (isConnectionError(error)) throw error;
      // Storage failure for an anonymous submission surfaces as a generic
      // upstream problem — nothing about the store leaks in the message.
      throw new Error("contact store unavailable");
    }
  }
}

export const contactRepository = new ContactRepository();
