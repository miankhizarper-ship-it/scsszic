import { useRef, useState } from "react";
import { Images, Upload } from "lucide-react";

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

/**
 * UploadMediaFilesButton (Task 16) — the MULTI-file variant for gallery
 * editors. One file-picker session can select any number of images (and,
 * where the folder allows it, videos); each file is uploaded sequentially
 * through the same authenticated endpoint and the collected public URLs are
 * handed over in ONE callback so the parent can append whole batch in order.
 *
 * The picker itself is filtered by `accept`, mirroring the server folder
 * allow-list (the server re-sniffs every file's bytes authoritatively).
 * Progress renders as "Uploading 3 of 7…" and a batch with failures still
 * returns the URLs that succeeded, plus a count of what failed.
 */
export function UploadMediaFilesButton({
  folder,
  accept,
  onUploaded,
  label = "Upload images",
  id,
  disabled = false,
}: {
  folder: MediaFolder;
  accept: string;
  /** Receives every successfully uploaded URL, in selection order. */
  onUploaded: (urls: string[]) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | undefined): Promise<void> {
    if (!files || files.length === 0 || uploading) return;
    setError(null);

    const list = Array.from(files);
    const tooLarge = list.filter((file) => file.size > MAX_UPLOAD_BYTES);
    const uploadable = list.filter((file) => file.size <= MAX_UPLOAD_BYTES);

    const urls: string[] = [];
    let failed = tooLarge.length;

    if (uploadable.length > 0) {
      setUploading(true);
      setProgress({ done: 0, total: uploadable.length });
      try {
        for (const [index, file] of uploadable.entries()) {
          try {
            const result = await adminService.uploadMedia(file, folder);
            urls.push(result.url);
          } catch {
            failed += 1;
          }
          setProgress({ done: index + 1, total: uploadable.length });
        }
      } finally {
        setUploading(false);
        setProgress(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    } else if (inputRef.current) {
      inputRef.current.value = "";
    }

    if (urls.length > 0) onUploaded(urls);

    if (failed > 0) {
      setError(
        failed === list.length
          ? "Upload failed. No files were stored — check the sizes and try again."
          : `${failed} of ${list.length} files could not be uploaded (size or type). The rest were added.`,
      );
    }
  }

  const busy = uploading && progress !== null;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files ?? undefined)}
      />
      <button
        type="button"
        disabled={uploading || disabled}
        onClick={() => inputRef.current?.click()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-navy-900 transition-colors hover:border-navy-300 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Images size={13} aria-hidden="true" />
        {busy ? `Uploading ${progress!.done} of ${progress!.total}…` : label}
      </button>
      {error && (
        <span role="alert" className="max-w-[20rem] text-xs font-medium text-error">
          {error}
        </span>
      )}
    </span>
  );
}
