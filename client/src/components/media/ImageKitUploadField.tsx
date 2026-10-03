import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  ImageKitUploadError,
  uploadImageToImagekit,
  type ImageKitFolder,
} from "@/services/imagekitService";

/**
 * ImageKitUploadField (Task 37) — the shared community image-upload control.
 *
 * A compact row: preview thumbnail (when a URL is already set), the upload
 * button (opens the file picker), and a remove action. The chosen file is
 * validated client-side, uploaded BROWSER-DIRECT to ImageKit with a
 * server-signed token, and the resulting CDN URL is handed to the form via
 * onChange — the caller keeps owning the URL value (it stays visible in
 * the sibling URL input and travels with the normal submit).
 *
 * Used by the member feed form (folder "feed") and the public-profile
 * editor (folder "avatar"); the server role-gates the sign endpoint, so
 * plain-user accounts can never reach the upload path even if this
 * component were mounted for them.
 */
export function ImageKitUploadField({
  value,
  onChange,
  folder,
  altText,
  disabled = false,
  label = "Upload an image",
  hint,
}: {
  /** The current image URL (may be empty). */
  value: string;
  /** Receives the uploaded CDN URL, or "" on remove. */
  onChange: (url: string) => void;
  /** Server-owned destination — "feed" artwork or "avatar". */
  folder: ImageKitFolder;
  /** Accessibility description for the preview thumbnail. */
  altText: string;
  disabled?: boolean;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file || uploading) return;
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadImageToImagekit(file, folder, setProgress);
      onChange(url);
    } catch (uploadError) {
      const message =
        uploadError instanceof ImageKitUploadError
          ? uploadError.message
          : "The image upload failed — please try again.";
      setError(message);
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset the input so picking the SAME file again still fires change.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <img
            src={value}
            alt={altText}
            className="size-14 shrink-0 rounded-lg border border-line object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-lg border border-dashed border-line bg-surface text-muted"
          >
            <ImagePlus size={20} />
          </span>
        )}
        {uploading ? (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
            <LoaderCircle size={15} aria-hidden="true" className="animate-spin text-gold-600" />
            Uploading… {progress}%
          </span>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={pick}
              disabled={disabled}
            >
              <ImagePlus size={14} aria-hidden="true" className="mr-1.5" />
              {value ? "Replace image" : label}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError(null);
                  onChange("");
                }}
                disabled={disabled}
              >
                <Trash2 size={14} aria-hidden="true" className="mr-1.5" />
                Remove
              </Button>
            )}
          </>
        )}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}
