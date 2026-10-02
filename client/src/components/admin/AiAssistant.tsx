import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";

import { ApiError } from "@/services/apiClient";
import {
  adminService,
  type AiFieldGenerateResult,
  type AiFieldKind,
} from "@/services/adminService";
import { cn } from "@/lib/utils";

/**
 * Admin AI assistant (Task 28) — the shared client for /api/admin/ai/field.
 *
 * Shape of the feature on every admin form page:
 *
 *   <AiAssistantProvider>            one per page — owns the pasted source
 *     <AiSourcePanel />              the "provide material" drawer
 *     …form with <AiFillButton …>    the ✦ icon next to eligible fields
 *   </AiAssistantProvider>
 *
 * The admin pastes raw material ONCE (notes, an outline, a draft, a CV),
 * then clicks the sparkle icon next to any field: the kind + source go to
 * OUR backend, which forwards the request to Groq (the key lives only in
 * the server env) and returns a cleaned, length-capped answer that is
 * dropped straight into the field. Nothing is auto-saved — the admin
 * reviews the generated text as part of the normal form submission.
 */

const MAX_SOURCE_LENGTH = 8_000;

interface AiAssistantContextValue {
  /** The pasted material the model works from. */
  source: string;
  setSource: (value: string) => void;
  /** Panel open state — buttons can force it open. */
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  /** Set when a click arrives with no material — the panel surfaces it. */
  needsSource: boolean;
  clearNeedsSource: () => void;
  /** The kind currently generating (drives that button's spinner). */
  pendingKind: AiFieldKind | null;
  /** Generate one field; `apply` receives the server's cleaned answer. */
  requestFill: (
    kind: AiFieldKind,
    apply: (result: AiFieldGenerateResult) => void,
    extras?: { context?: string; title?: string },
  ) => Promise<void>;
  /** Last error per kind (icon turns red + tooltip; panel shows detail). */
  errorFor: (kind: AiFieldKind) => string | null;
}

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

export function useAiAssistant(): AiAssistantContextValue {
  const context = useContext(AiAssistantContext);
  if (!context) {
    throw new Error("useAiAssistant must be used inside <AiAssistantProvider>.");
  }
  return context;
}

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [needsSource, setNeedsSource] = useState(false);
  const [pendingKind, setPendingKind] = useState<AiFieldKind | null>(null);
  const [errors, setErrors] = useState<Partial<Record<AiFieldKind, string>>>({});

  const clearNeedsSource = useCallback(() => setNeedsSource(false), []);

  const requestFill = useCallback(
    async (
      kind: AiFieldKind,
      apply: (result: AiFieldGenerateResult) => void,
      extras?: { context?: string; title?: string },
    ) => {
      if (pendingKind !== null) return;
      const material = source.trim();
      if (material.length < 3) {
        // No material yet — open the drawer instead of round-tripping a 400.
        setNeedsSource(true);
        setPanelOpen(true);
        setErrors((current) => ({ ...current, [kind]: "Add some material in the AI panel first." }));
        return;
      }

      setPanelOpen(true);
      setNeedsSource(false);
      setPendingKind(kind);
      setErrors((current) => ({ ...current, [kind]: undefined }));
      try {
        const result = await adminService.generateAiField({
          kind,
          source: material.slice(0, MAX_SOURCE_LENGTH),
          context: extras?.context,
          title: extras?.title || undefined,
        });
        apply(result);
      } catch (error) {
        setErrors((current) => ({
          ...current,
          [kind]:
            error instanceof ApiError
              ? error.message
              : "The AI assistant could not be reached. Please try again.",
        }));
      } finally {
        setPendingKind(null);
      }
    },
    [pendingKind, source],
  );

  const errorFor = useCallback(
    (kind: AiFieldKind) => errors[kind] ?? null,
    [errors],
  );

  const value = useMemo(
    () => ({
      source,
      setSource,
      panelOpen,
      setPanelOpen,
      needsSource,
      clearNeedsSource,
      pendingKind,
      requestFill,
      errorFor,
    }),
    [source, panelOpen, needsSource, clearNeedsSource, pendingKind, requestFill, errorFor],
  );

  return <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>;
}

/**
 * Only speaks up when the deployment is missing its key: a healthy provider
 * renders nothing (the panel stays clean — no development-phase boilerplate),
 * and the one state that needs admin action says exactly what to set where.
 * A failed status probe stays silent too — the sparkle buttons already
 * surface the server's 503 message on click, so nothing nags twice.
 */
function AiConfigLine() {
  const [misconfigured, setMisconfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getAiStatus()
      .then((data) => {
        if (!cancelled) setMisconfigured(data.enabled === false);
      })
      .catch(() => {
        if (!cancelled) setMisconfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!misconfigured) return null;

  return (
    <p className="mt-2 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-xs leading-relaxed text-navy-700">
      Not configured on this deployment — set GROQ_API_KEY (and optionally GROQ_MODEL) on
      the SERVER project in Vercel → Settings → Environment Variables, then redeploy the
      server.
    </p>
  );
}

/**
 * The per-page "provide material" drawer. Lives at the top of each admin
 * form page, above the form sections. Collapsed by default so the form
 * stays the hero; opens itself when a sparkle click needs material.
 */
export function AiSourcePanel({ className }: { className?: string }) {
  const {
    source,
    setSource,
    panelOpen,
    setPanelOpen,
    needsSource,
    clearNeedsSource,
  } = useAiAssistant();

  return (
    <section
      aria-label="AI assistant"
      className={cn(
        "rounded-xl border bg-white shadow-sm transition-colors",
        needsSource ? "border-gold-500" : "border-line",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => {
          setPanelOpen(!panelOpen);
          clearNeedsSource();
        }}
        aria-expanded={panelOpen}
        className="flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left sm:px-5"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gold-100 text-gold-600">
          <Sparkles size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-bold text-navy-900">
            AI assistant
          </span>
          <span className="block truncate text-xs text-muted">
            Paste your material once, then fill any field with the sparkle button
          </span>
        </span>
        {source.trim().length >= 3 && !panelOpen && (
          <span className="hidden shrink-0 rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-gold-700 sm:inline">
            Material ready
          </span>
        )}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn("shrink-0 text-muted transition-transform", panelOpen && "rotate-180")}
        />
      </button>

      {panelOpen && (
        <div className="border-t border-line px-4 pb-4 pt-3 sm:px-5">
          <AiConfigLine />
          <label htmlFor="ai-source" className="mb-1.5 mt-3 block text-xs font-semibold uppercase tracking-wider text-muted">
            Source material
          </label>
          <textarea
            id="ai-source"
            value={source}
            maxLength={MAX_SOURCE_LENGTH}
            onChange={(event) => {
              setSource(event.target.value);
              if (event.target.value.trim().length >= 3) clearNeedsSource();
            }}
            rows={5}
            placeholder={
              "Paste the raw content the AI should work from — event details, an article draft, a member's CV, project notes, links…"
            }
            className="w-full resize-y rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
          />
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {needsSource
                ? "Paste some material below, then click a sparkle button next to any field."
                : "The AI only writes into the field you click — you stay in control of every value."}
            </p>
            <p aria-hidden="true" className={cn("shrink-0 text-xs", source.length >= MAX_SOURCE_LENGTH ? "font-semibold text-error" : "text-muted")}>
              {source.length.toLocaleString()}/{MAX_SOURCE_LENGTH.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

interface AiFillButtonProps {
  /** Which server-side generation contract to use. */
  kind: AiFieldKind;
  /** Human field name for the aria-label/tooltip, e.g. "Title". */
  label: string;
  /** Receives the cleaned answer — write it into the form here. */
  apply: (result: AiFieldGenerateResult) => void;
  /** Optional page hint, e.g. "event". */
  context?: string;
  /** Optional existing title (improves excerpt/alt generation). */
  title?: string;
  className?: string;
}

/**
 * The sparkle icon that sits next to an eligible field's label. Renders
 * nothing when the server has no key configured? — no: it always renders,
 * and a click surfaces the server's 503 message in the AI panel, so the
 * feature degrades honestly instead of silently disappearing.
 */
export function AiFillButton({
  kind,
  label,
  apply,
  context,
  title,
  className,
}: AiFillButtonProps) {
  const { requestFill, pendingKind, errorFor } = useAiAssistant();
  const pending = pendingKind === kind;
  const error = errorFor(kind);

  return (
    <button
      type="button"
      disabled={pendingKind !== null && !pending}
      aria-label={`Fill ${label} with AI`}
      title={error ?? `Fill ${label} with AI`}
      onClick={() => void requestFill(kind, apply, { context, title })}
      className={cn(
        "ml-1.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md border align-middle transition-colors",
        "border-line text-muted hover:border-gold-400 hover:bg-gold-50 hover:text-gold-600",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        pending && "border-gold-400 bg-gold-50 text-gold-600",
        error && !pending && "border-error/40 bg-error/5 text-error hover:border-error hover:bg-error/10",
        className,
      )}
    >
      {pending ? (
        <Loader2 size={13} aria-hidden="true" className="animate-spin" />
      ) : (
        <Sparkles size={13} aria-hidden="true" />
      )}
    </button>
  );
}
