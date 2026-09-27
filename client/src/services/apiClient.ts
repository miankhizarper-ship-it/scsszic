/**
 * Central HTTP client for the SCS API.
 *
 * Every service shares this one fetch layer:
 *  - same-origin `/api` base (Vite proxies to Express in development)
 *  - `credentials: "include"` on EVERY call — the HTTP-only session cookie
 *    rides along automatically; there are no tokens to attach
 *  - JSON body serialization + query-string building from `params`
 *  - typed errors (ApiError) carrying the server-authored safe message and
 *    optional field-level `errors` from validation/conflict responses
 *
 * Configuration:
 *  - Override with `VITE_API_BASE_URL` when the API lives elsewhere.
 */

const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  readonly status: number;
  /** Field → message map from 400/409 responses (forms bind to this). */
  readonly errors?: Record<string, string>;

  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

type QueryParams = Record<string, string | number | boolean | undefined>;

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  /** Plain object → JSON; FormData → multipart passthrough (uploads). */
  body?: unknown;
  /** Query parameters — undefined/empty values are skipped, values stringified. */
  params?: QueryParams;
};

function buildQueryString(params: QueryParams | undefined): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export async function apiFetch<T>(
  path: string,
  { body, params, headers, ...rest }: ApiFetchOptions = {},
): Promise<T> {
  // FormData (media uploads, Phase 10A) is passed through untouched: the
  // browser then sets its own Content-Type with the multipart boundary, and
  // credentials ride along exactly like every other call.
  const isFormData = body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}${buildQueryString(params)}`, {
    credentials: "include",
    headers: {
      ...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
    ...rest,
  });

  if (!response.ok) {
    const { message, errors } = await safeErrorBody(response);
    throw new ApiError(
      response.status,
      message ?? `Request failed with status ${response.status}`,
      errors,
    );
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

interface ErrorBody {
  message?: string;
  errors?: Record<string, string>;
}

async function safeErrorBody(response: Response): Promise<ErrorBody> {
  try {
    const data = (await response.json()) as ErrorBody;
    return {
      message: data.message ?? `Request failed with status ${response.status}`,
      errors: typeof data.errors === "object" && data.errors !== null ? data.errors : undefined,
    };
  } catch {
    return { message: `Request failed with status ${response.status}` };
  }
}
