import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Info, LogIn } from "lucide-react";
import { useForm } from "react-hook-form";

import { AuthField, AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthProvider";
import { getFieldErrors } from "@/services/authService";
import { sanitizeRedirect } from "@/lib/safeRedirect";
import { buildPageTitle, usePageMetadata } from "@/lib/seo";

interface LoginForm {
  identifier: string;
  password: string;
}

/**
 * LoginPage — "Welcome back" (spec §20).
 *
 * Email OR username + password against POST /api/auth/login. Field-level
 * errors from the server (400/409) map onto inputs; login failures surface
 * one generic message (the server deliberately never says which half was
 * wrong — no user enumeration). On success the visitor returns to
 * `?redirect=` (internal paths only — see lib/safeRedirect).
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
      navigate(sanitizeRedirect(searchParams.get("redirect")), { replace: true });
    } catch (error) {
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
      icon={LogIn}
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
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <AuthField id="identifier" label="Email or username" error={errors.identifier?.message}>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder="e.g. demo-member or you@example.com"
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby={errors.identifier ? "identifier-error" : undefined}
            className="h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error"
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

        <aside className="rounded-lg border border-gold-500/30 bg-gold-50/70 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-700">
            <Info size={12} aria-hidden="true" />
            Development demo
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-gold-800/80">
            Try the signed-in experience with the fictional demo member —{" "}
            <span className="font-semibold">demo-member</span> /{" "}
            <span className="font-mono font-semibold">scs-demo-2026</span>. Accounts reset when
            the development server restarts.
          </p>
        </aside>
      </form>
    </AuthShell>
  );
}
