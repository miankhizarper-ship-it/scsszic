import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "goldSoft" // gold-tinted chip on light surfaces
  | "navySoft" // navy-tinted chip on light surfaces
  | "solidGold" // solid gold — high emphasis
  | "onDark"; // subtle chip on navy surfaces

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  goldSoft: "border-gold-200 bg-gold-50 text-gold-700",
  navySoft: "border-navy-100 bg-navy-50 text-navy-700",
  solidGold: "border-gold-500 bg-gold-500 text-navy-950",
  onDark: "border-white/15 bg-white/10 text-gold-300",
};

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

/** Badge — small category/status chip. Not interactive. */
export function Badge({ variant = "goldSoft", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5",
        "text-[11px] font-semibold uppercase tracking-wider",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
