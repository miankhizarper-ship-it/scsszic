import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  Send,
  Users,
} from "lucide-react";

import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { AuthField, AUTH_INPUT_CLASSES } from "@/components/auth/AuthShell";
import { SOCIAL_LINKS } from "@/data/navigation";
import { contactService, type ContactPayload } from "@/services/contactService";
import { ApiError } from "@/services/apiClient";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

/**
 * ContactPage — /contact.
 *
 * Two surfaces in one view:
 *   1. Contact options — the society email, where the society lives
 *      (SZIC, University of Peshawar), the community surfaces, and an
 *      expectation-setting note about response times.
 *   2. A contact form → POST /api/contact (anonymous). Server-side
 *      validation errors map back onto the fields; success swaps the form
 *      for a confirmation panel.
 */

type ContactFormValues = ContactPayload & { company?: string };

export default function ContactPage() {
  usePageMetadata({
    title: buildPageTitle("Contact"),
    description:
      "Get in touch with the Society of Computer Science at SZIC, University of Peshawar — questions, ideas, speaker proposals, or partnership requests.",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    defaultValues: { name: "", email: "", subject: "", message: "", company: "" },
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (values: ContactFormValues) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const message = await contactService.sendMessage({
        name: values.name,
        email: values.email,
        subject: values.subject,
        message: values.message,
      });
      setSuccessMessage(message);
      reset();
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        const first = Object.values(error.errors)[0];
        setFormError(first ?? "Please check the highlighted fields.");
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Your message couldn't be sent. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const contactOptions = [
    {
      icon: Mail,
      title: "Email the society",
      lines: ["scs@szic.edu.pk", "Best for official questions, speaker proposals, and partnerships."],
      href: "mailto:scs@szic.edu.pk",
      action: "Send an email",
    },
    {
      icon: MapPin,
      title: "Find us on campus",
      lines: [
        "Society of Computer Science",
        "SZIC, University of Peshawar, Peshawar, Khyber Pakhtunkhwa",
      ],
      href: "https://maps.google.com/?q=SZIC+University+of+Peshawar",
      action: "Open in Maps",
    },
    {
      icon: Users,
      title: "Join the community",
      lines: [
        "Create a member account to like posts, comment on the feed, and get event announcements first.",
      ],
      href: "/signup",
      action: "Create an account",
      internal: true,
    },
  ];

  return (
    <>
      <PageHero
        id="contact-hero"
        eyebrow="Contact"
        title={<>Let's start a <span className="text-gold-400">conversation</span>.</>}
        description="Questions about events, membership, or projects? Want to speak, sponsor, or collaborate? Send a message — the society team reads everything."
      />

      <section aria-label="Contact the society" className="bg-surface py-12 lg:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* ---------- Contact options ---------- */}
            <div className="flex flex-col gap-4 lg:col-span-2">
              {contactOptions.map(({ icon: Icon, title, lines, href, action, internal }) => (
                <div
                  key={title}
                  className="rounded-xl border border-line bg-white p-5 shadow-sm"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-navy-900 text-gold-300">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <h2 className="mt-3 font-display text-base font-bold text-navy-900">
                    {title}
                  </h2>
                  {lines.map((line) => (
                    <p key={line} className="mt-1.5 text-sm leading-relaxed text-muted">
                      {line}
                    </p>
                  ))}
                  <a
                    href={href}
                    {...(internal ? {} : { target: "_blank", rel: "noreferrer" })}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-navy-900 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                  >
                    {action}
                    <Send size={13} aria-hidden="true" />
                  </a>
                </div>
              ))}

              <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
                <span className="grid size-10 place-items-center rounded-lg bg-navy-900 text-gold-300">
                  <Clock3 size={18} aria-hidden="true" />
                </span>
                <h2 className="mt-3 font-display text-base font-bold text-navy-900">
                  Response times
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Messages are usually answered within 2–3 working days during the
                  semester. Event-week volumes can add a little delay — the feed and
                  event pages always carry the latest schedule.
                </p>
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Society social profiles">
                  {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        aria-label={label}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-navy-300 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                      >
                        <Icon size={16} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ---------- Form ---------- */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
                {successMessage ? (
                  <div
                    role="status"
                    className="flex flex-col items-center gap-3 py-10 text-center"
                  >
                    <CheckCircle2 size={40} aria-hidden="true" className="text-gold-600" />
                    <h2 className="font-display text-xl font-bold text-navy-900">
                      Message received
                    </h2>
                    <p className="max-w-md text-sm leading-relaxed text-muted">
                      {successMessage}
                    </p>
                    <Button variant="outline" className="mt-2" onClick={() => setSuccessMessage(null)}>
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-display text-xl font-bold text-navy-900 sm:text-2xl">
                      Send us a message
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Fields marked with an asterisk (
                      <span aria-hidden="true" className="text-gold-700">
                        *
                      </span>
                      ) are required. Your details are only used to reply.
                    </p>

                    <form
                      className="mt-6 flex flex-col gap-5"
                      onSubmit={handleSubmit((values) => void onSubmit(values))}
                      noValidate
                    >
                      {/* Honeypot — visually hidden; bots fill it, humans never see it. */}
                      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                        <label htmlFor="company">Company (leave empty)</label>
                        <input
                          id="company"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          {...register("company")}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <AuthField id="contact-name" label="Full name" error={errors.name?.message}>
                          <input
                            id="contact-name"
                            type="text"
                            autoComplete="name"
                            placeholder="e.g. Ahmad Shah"
                            aria-invalid={Boolean(errors.name)}
                            aria-describedby={errors.name ? "contact-name-error" : undefined}
                            className={AUTH_INPUT_CLASSES}
                            {...register("name", {
                              required: "Enter your name.",
                              minLength: { value: 2, message: "Enter your name (at least 2 characters)." },
                              maxLength: { value: 120, message: "Name must be at most 120 characters." },
                            })}
                          />
                        </AuthField>

                        <AuthField id="contact-email" label="Email address" error={errors.email?.message}>
                          <input
                            id="contact-email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? "contact-email-error" : undefined}
                            className={AUTH_INPUT_CLASSES}
                            {...register("email", {
                              required: "Enter your email address.",
                              pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
                                message: "Enter a valid email address.",
                              },
                            })}
                          />
                        </AuthField>
                      </div>

                      <AuthField id="contact-subject" label="Subject" error={errors.subject?.message}>
                        <input
                          id="contact-subject"
                          type="text"
                          placeholder="e.g. Workshop proposal for the spring semester"
                          aria-invalid={Boolean(errors.subject)}
                          aria-describedby={errors.subject ? "contact-subject-error" : undefined}
                          className={AUTH_INPUT_CLASSES}
                          {...register("subject", {
                            required: "Enter a subject.",
                            minLength: { value: 2, message: "Enter a subject." },
                            maxLength: { value: 150, message: "Subject must be at most 150 characters." },
                          })}
                        />
                      </AuthField>

                      <AuthField
                        id="contact-message"
                        label="Message"
                        error={errors.message?.message}
                        hint="At least 10 characters — the more detail, the better the reply."
                      >
                        <textarea
                          id="contact-message"
                          rows={6}
                          placeholder="Tell us what's on your mind…"
                          aria-invalid={Boolean(errors.message)}
                          aria-describedby={
                            errors.message
                              ? "contact-message-error"
                              : "contact-message-hint"
                          }
                          className={cn(AUTH_INPUT_CLASSES, "h-auto py-2.5")}
                          {...register("message", {
                            required: "Write your message.",
                            minLength: { value: 10, message: "Your message must be at least 10 characters." },
                            maxLength: { value: 4000, message: "Message must be at most 4000 characters." },
                          })}
                        />
                      </AuthField>

                      {formError && (
                        <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm font-medium text-error">
                          {formError}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-3">
                        <Button type="submit" variant="navy" disabled={submitting}>
                          {submitting ? (
                            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
                          ) : (
                            <Send size={16} aria-hidden="true" />
                          )}
                          {submitting ? "Sending…" : "Send message"}
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
