import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { AUTH_INPUT_CLASSES } from "@/components/auth/AuthShell";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
>;

interface PasswordFieldProps extends PasswordInputProps {
  /** Shown to screen readers on the toggle, e.g. "Password" / "Confirm password". */
  toggleLabel: string;
  /** Optional extra classes appended after the shared auth input styles. */
  className?: string;
}

/**
 * PasswordField — password input with an accessible visibility toggle.
 *
 * Spreads standard input props, so React Hook Form `register()` binds
 * directly: `<PasswordField {...register("password")} toggleLabel="Password" />`.
 * The toggle is a real button (never hover-only), announces state via
 * aria-label + aria-pressed, and never submits the form.
 */
export function PasswordField({
  toggleLabel,
  className,
  disabled,
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        className={cn(AUTH_INPUT_CLASSES, "pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? `Hide ${toggleLabel.toLowerCase()}` : `Show ${toggleLabel.toLowerCase()}`}
        aria-pressed={visible}
        disabled={disabled}
        className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:bg-navy-50 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-500 disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? (
          <EyeOff size={16} aria-hidden="true" />
        ) : (
          <Eye size={16} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
