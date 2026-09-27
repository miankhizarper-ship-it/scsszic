import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import { adminService, type MediaFolder } from "@/services/adminService";

/**
 * UploadMediaButton (Phase 10A) — a compact "Upload" affordance for admin
 * media fields. Opens the file picker, sends the file through the
 * authenticated API (`adminService.uploadMedia` → POST /api/admin/uploads)
 * and hands the returned public URL to the form via `onUploaded`.
 *
 * Deliberately NOT a redesign: it renders as one small outline button that
 * sits beside the existing URL text input, which keeps working exactly as
 * before (external/local URLs remain valid). Storage credentials never
 * reach the browser — the browser talks only to our API.
 *
 * Errors (unsupported type / size cap / storage unconfigured) surface from
 * the server's safe message and render inline under the button.
 */

/** Mirrors the server's serverless-safe upload cap (4 MB). */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

interface UploadMediaButtonProps {
  /** Target library — matches the server folder allow-list. */
  folder: MediaFolder;
  /** File picker filter, e.g. "image/*" or "video/mp4,video/webm". */
  accept: string;
  /** Receives the public media URL once the upload succeeds. */
  onUploaded: (url: string) => void;
  label?: string;
  /** Optional id forwarded to the hidden file input (a11y wiring). */
  id?: string;
}

export function UploadMediaButton({
  folder,
  accept,
  onUploaded,
  label = "Upload",
  id,
}: UploadMediaButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file || uploading) return;
    setError(null);

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File is too large. Maximum size is 4 MB.");
      return;
    }

    setUploading(true);
    try {
      const result = await adminService.uploadMedia(file, folder);
      onUploaded(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset so selecting the same file again still fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-navy-900 transition-colors hover:border-navy-300 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Upload size={13} aria-hidden="true" />
        {uploading ? "Uploading…" : label}
      </button>
      {error && (
        <span role="alert" className="max-w-[16rem] text-xs font-medium text-error">
          {error}
        </span>
      )}
    </span>
  );
}
