import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";

import { AuthField, AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { GoogleIcon, googleOAuthUrl } from "@/components/auth/googleOAuth";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthProvider";
import { getFieldErrors } from "@/services/authService";
import { ApiError } from "@/services/apiClient";
import { sanitizeRedirect } from "@/lib/safeRedirect";
import { ROUTES } from "@/routes/paths";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

interface LoginForm {
  identifier: string;
  password: string;
}

/**
 * Human copy for the `?oauth=<reason>` codes the Google callback redirects
 * back with (see server/src/controllers/googleAuth.controller.ts). Unknown
 * or missing reasons render nothing — the notice only ever appears after a
 * Google round-trip that did not finish.
 */
const OAUTH_NOTICES: Record<string, string> = {
  unconfigured:
    "Google sign-in isn't set up on the server yet — use your email and password for now.",
  denied: "Google sign-in was cancelled. You can try again whenever you're ready.",
  state: "That Google sign-in expired before it finished — start again below.",
  exchange: "Google sign-in hit a temporary problem exchanging the login — please try again.",
  profile: "Google sign-in hit a temporary problem reading your profile — please try again.",
  email_unverified:
    "Your Google account's email address isn't verified with Google yet — verify it with Google, then try again.",
  busy: "Something went wrong finishing Google sign-in — please try again in a moment.",
};

/**
 * LoginPage — "Welcome back" (spec §20).
 *
 * Email OR username + password against POST /api/auth/login. Field-level
 * errors from the server (400/409) map onto inputs; login failures surface
 * one generic message (the server deliberately never says which half was
 * wrong — no user enumeration). On success the visitor returns to
 * `?redirect=` (internal paths only — see lib/safeRedirect), otherwise HOME.
 *
 * A 403 `email_not_verified` answer (unverified accounts cannot sign in)
 * bounces to the "check your inbox" page, which offers a fresh link.
 */
export default function LoginPage() {
  usePageMetadata({
    title: buildPageTitle("Login"),
    description:
      "Sign in to your Society of Computer Science account with your email or username.",
  });

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const oauthNotice = OAUTH_NOTICES[searchParams.get("oauth") ?? ""] ?? null;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ defaultValues: { identifier: "", password: "" } });

  const onSubmit = async (values: LoginForm) => {
    setFormError(null);
    try {
      await login(values.identifier, values.password);
      navigate(sanitizeRedirect(searchParams.get("redirect"), ROUTES.home), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        // Unverified account — the password was correct, the inbox isn't done
        // yet. The 403 body carries the account email for the resend flow.
        const email = typeof error.body?.email === "string" ? error.body.email : values.identifier;
        navigate(ROUTES.checkEmail, {
          replace: true,
          state: { email, reason: "unverified" },
        });
        return;
      }
      const fieldErrors = getFieldErrors(error);
      if (fieldErrors?.identifier) {
        setError("identifier", { message: fieldErrors.identifier });
      }
      if (fieldErrors?.password) {
        setError("password", { message: fieldErrors.password });
      }
      if (!fieldErrors?.identifier && !fieldErrors?.password) {
        setFormError(error instanceof Error ? error.message : "Sign in failed. Please try again.");
      }
    }
  };

  return (
    <AuthShell
      eyebrow="Member Access"
      title="Welcome back"
      description="Sign in to your SCS account with your email or username."
      footer={
        <>
          New to the society?{" "}
          <Link
            to="/signup"
            className="font-semibold text-gold-700 transition-colors hover:text-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            Create an account
          </Link>
        </>
      }
    >
      {oauthNotice && (
        <p role="status" className="rounded-lg border border-gold-500/40 bg-gold-500/10 px-3.5 py-2.5 text-xs font-medium text-ink">
          {oauthNotice}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <AuthField id="identifier" label="Email or username" error={errors.identifier?.message}>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder="your-username or you@example.com"
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby={errors.identifier ? "identifier-error" : undefined}
            className="h-11 w-full rounded-lg border bg-white px-3.5 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 sm:text-sm aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error"
            {...register("identifier", { required: "Enter your email or username." })}
          />
        </AuthField>

        <AuthField id="password" label="Password" error={errors.password?.message}>
          <PasswordField
            id="password"
            toggleLabel="Password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password", { required: "Enter your password." })}
          />
        </AuthField>

        {formError && (
          <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-3.5 py-2.5 text-xs font-medium text-error">
            {formError}
          </p>
        )}

        <Button type="submit" variant="navy" disabled={isSubmitting} className="w-full justify-center">
          {isSubmitting ? "Signing in…" : "Sign in"}
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
