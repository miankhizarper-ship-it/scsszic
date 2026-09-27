import { apiFetch } from "@/services/apiClient";

/**
 * Contact service — the public POST /api/contact endpoint (anonymous).
 *
 * The server validates (bounds + email shape), throttles per IP, and
 * silently drops honeypot hits; the response is always the same success
 * envelope so the form can confirm without exposing anything.
 */
export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const contactService = {
  async sendMessage(payload: ContactPayload): Promise<string> {
    return apiFetch<{ message: string }>("/contact", {
      method: "POST",
      body: payload,
    }).then((r) => r.message);
  },
};
