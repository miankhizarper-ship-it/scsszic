import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";

import { AuthField, AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { GoogleIcon, googleOAuthUrl } from "@/components/auth/googleOAuth";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthProvider";
import { getFieldErrors } from "@/services/authService";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

interface SignupForm {
  displayName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Client-side signup rules — UX only, the SERVER is authoritative
 * (server/src/auth/validation.ts). Mirroring them here avoids a round-trip
 * for trivially invalid input; any server 400/409 still maps onto fields.
 */
const USERNAME_PATTERN = /^[a-z0-9_-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * SignupPage — "Join SCS" (spec §20).
 *
 * Creates the account (POST /api/auth/signup). With the email-verification
 * flow active the server starts NO session: the visitor is sent to the
 * "check your inbox" page (with the failure reason when the mailer could not
 * dispatch) and must click the emailed link before signing in. Duplicate
 * email/username surface as clean 409 field errors — never as raw internals.
 */
export default function SignupPage() {
  usePageMetadata({
    title: buildPageTitle("Join SCS"),
    description:
      "Create your Society of Computer Science account — join a community of aspiring computer scientists at SZIC.",
  });

  const { signup } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    defaultValues: { displayName: "", username: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: SignupForm) => {
    setFormError(null);
    try {
      const result = await signup(values);
      if (result.user.isVerified === false) {
        // Verification flow owns the next step: no session was created.
        const reason = !result.verification.enabled
          ? "unconfigured"
          : result.verification.sent
            ? "sent"
            : "send_failed";
        navigate(ROUTES.checkEmail, {
          replace: true,
          state: { email: values.email, reason, detail: result.verification.detail },
        });
        return;
      }
      // Dev fallback (no Brevo credentials): auto-verified with a session —
      // go enjoy the site.
      navigate(ROUTES.home, { replace: true });
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      const mapped = Object.entries(fieldErrors ?? {});
      if (mapped.length > 0) {
        for (const [field, message] of mapped) {
          if (field in errors || ["displayName", "username", "email", "password", "confirmPassword"].includes(field)) {
            setError(field as keyof SignupForm, { message });
          }
        }
      }
      if (mapped.length === 0) {
        setFormError(error instanceof Error ? error.message : "Signup failed. Please try again.");
      }
    }
  };

  return (
    <AuthShell
      wide
      eyebrow="Join The Society"
      title="Create your account"
      description="One account for the community — the feed, the member directory, and everything the platform grows into next."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-gold-700 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <AuthField
          id="displayName"
          label="Display name"
          error={errors.displayName?.message}
          hint="How your name appears across the platform."
        >
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={errors.displayName ? "displayName-error" : undefined}
            className="h-11 w-full rounded-lg border bg-white px-3.5 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 sm:text-sm aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error"
            {...register("displayName", {
              required: "Display name is required.",
              minLength: { value: 2, message: "Display name must be at least 2 characters." },
              maxLength: { value: 60, message: "Display name must be at most 60 characters." },
            })}
          />
        </AuthField>

        <AuthField
          id="username"
          label="Username"
          error={errors.username?.message}
          hint="Letters, numbers, hyphens, or underscores — 3 to 24 characters. This becomes your profile handle."
        >
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="your-username"
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? "username-error" : undefined}
            className="h-11 w-full rounded-lg border bg-white px-3.5 font-mono text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 sm:text-sm aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error"
            {...register("username", {
              required: "Username is required.",
              minLength: { value: 3, message: "Username must be at least 3 characters." },
              maxLength: { value: 24, message: "Username must be at most 24 characters." },
              pattern: {
                value: USERNAME_PATTERN,
                message: "Use letters, numbers, hyphens, or underscores only.",
              },
            })}
          />
        </AuthField>

        <AuthField id="email" label="Email" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="h-11 w-full rounded-lg border bg-white px-3.5 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 sm:text-sm aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error"
            {...register("email", {
              required: "Email is required.",
              pattern: { value: EMAIL_PATTERN, message: "Enter a valid email address." },
            })}
          />
        </AuthField>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <AuthField id="password" label="Password" error={errors.password?.message}>
            <PasswordField
              id="password"
              toggleLabel="Password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password", {
                required: "Password is required.",
                minLength: { value: 8, message: "Password must be at least 8 characters." },
              })}
            />
          </AuthField>

          <AuthField
            id="confirmPassword"
            label="Confirm password"
            error={errors.confirmPassword?.message}
          >
            <PasswordField
              id="confirmPassword"
              toggleLabel="Confirm password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              {...register("confirmPassword", {
                required: "Confirm your password.",
                validate: (value) => value === watch("password") || "Passwords do not match.",
              })}
            />
          </AuthField>
        </div>

        {formError && (
          <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-xs font-medium text-error">
            {formError}
          </p>
        )}

        <Button type="submit" variant="navy" disabled={isSubmitting} className="w-full justify-center">
          {isSubmitting ? "Creating account…" : "Create account"}
          {!isSubmitting && <ArrowRight size={15} aria-hidden="true" />}
        </Button>

        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs font-medium text-muted">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Button variant="outline" href={googleOAuthUrl()} className="w-full justify-center">
          <GoogleIcon size={16} />
          Continue with Google
        </Button>
      </form>
    </AuthShell>
  );
}
