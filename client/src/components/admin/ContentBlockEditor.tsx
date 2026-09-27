import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useFieldArray, useWatch, type Control, type FieldArrayWithId, type FieldErrors, type UseFieldArrayMove, type UseFormRegister } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { BLOCK_TYPES, type BlogFormValues } from "@/lib/adminBlogForm";

/**
 * ContentBlockEditor (Phase 9D) — structured-content editing for the Blog
 * form, over the project's EXISTING block schema (BlogContentBlock: para-
 * graph, heading, list, code, quote, callout). Blocks can be added, typed,
 * edited, reordered, and removed; nothing about the storage format changes
 * and no rich-text dependency is introduced. Each block keeps a uniform
 * editing shape; toBlogPayload() projects it back onto the exact union the
 * public renderer maps onto markup.
 */

const INPUT_CLASS =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-gold-500 aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error";

const TYPE_LABEL: Record<BlogFormValues["content"][number]["type"], string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  list: "List",
  code: "Code",
  quote: "Quote",
  callout: "Callout",
};

function BlockFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-error">{message}</p>;
}

export function ContentBlockEditor({
  control,
  register,
  errors,
}: {
  control: Control<BlogFormValues>;
  register: UseFormRegister<BlogFormValues>;
  errors: FieldErrors<BlogFormValues>;
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "content" });

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4" aria-label="Article content blocks">
        {fields.map((field: FieldArrayWithId<BlogFormValues>, index: number) => (
          <BlockCard
            key={field.id}
            index={index}
            total={fields.length}
            control={control}
            register={register}
            errors={errors}
            remove={remove}
            move={move}
          />
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {BLOCK_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(defaultBlock(type))}
          >
            + {TYPE_LABEL[type]}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Sensible starting values per block type — ready to edit, nothing invented. */
function defaultBlock(type: BlogFormValues["content"][number]["type"]): BlogFormValues["content"][number] {
  return {
    type,
    text: "",
    level: "2",
    ordered: false,
    items: "",
    language: "",
    code: "",
    caption: "",
    attribution: "",
    variant: "note",
    blockTitle: "",
  };
}

function BlockCard({
  index,
  total,
  control,
  register,
  errors,
  remove,
  move,
}: {
  index: number;
  total: number;
  control: Control<BlogFormValues>;
  register: UseFormRegister<BlogFormValues>;
  errors: FieldErrors<BlogFormValues>;
  remove: (index: number) => void;
  move: UseFieldArrayMove;
}) {
  const blockType = useWatch({ control, name: `content.${index}.type` });
  const blockErrors = errors.content?.[index];

  return (
    <li className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Block {index + 1}
        </span>
        <label className="sr-only" htmlFor={`content-${index}-type`}>
          Block {index + 1} type
        </label>
        <select
          id={`content-${index}-type`}
          className="h-8 rounded-lg border border-line bg-white px-2 text-xs font-semibold text-navy-900 transition-colors hover:border-navy-300 focus:outline-2 focus:outline-offset-1 focus:outline-gold-500"
          {...register(`content.${index}.type` as const)}
        >
          {BLOCK_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABEL[type]}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => move(index, index - 1)}
            disabled={index === 0}
            aria-label={`Move block ${index + 1} up`}
            title="Move up"
            className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowUp size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move(index, index + 1)}
            disabled={index === total - 1}
            aria-label={`Move block ${index + 1} down`}
            title="Move down"
            className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowDown size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => remove(index)}
            disabled={total === 1}
            aria-label={`Remove block ${index + 1}`}
            title="Remove block"
            className="grid size-8 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4">
        {(blockType === "paragraph" || blockType === "quote") && (
          <div>
            <label htmlFor={`content-${index}-text`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              {blockType === "quote" ? "Quote text" : "Text"} <span aria-hidden="true" className="text-error">*</span>
            </label>
            <textarea
              id={`content-${index}-text`}
              rows={blockType === "quote" ? 3 : 5}
              aria-invalid={Boolean(blockErrors?.text)}
              aria-describedby={blockErrors?.text ? `content-${index}-text-error` : undefined}
              className={INPUT_CLASS}
              {...register(`content.${index}.text` as const)}
            />
            <BlockFieldError message={blockErrors?.text?.message} />
            {blockType === "quote" && (
              <div className="mt-3">
                <label htmlFor={`content-${index}-attribution`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                  Attribution
                </label>
                <input
                  id={`content-${index}-attribution`}
                  type="text"
                  className={INPUT_CLASS}
                  {...register(`content.${index}.attribution` as const)}
                />
              </div>
            )}
          </div>
        )}

        {blockType === "heading" && (
          <>
            <div>
              <label htmlFor={`content-${index}-level`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                Heading level
              </label>
              <select
                id={`content-${index}-level`}
                className={INPUT_CLASS}
                {...register(`content.${index}.level` as const)}
              >
                <option value="2">Section (H2)</option>
                <option value="3">Subsection (H3)</option>
              </select>
            </div>
            <div>
              <label htmlFor={`content-${index}-text`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                Heading text <span aria-hidden="true" className="text-error">*</span>
              </label>
              <input
                id={`content-${index}-text`}
                type="text"
                aria-invalid={Boolean(blockErrors?.text)}
                className={INPUT_CLASS}
                {...register(`content.${index}.text` as const)}
              />
              <BlockFieldError message={blockErrors?.text?.message} />
            </div>
          </>
        )}

        {blockType === "list" && (
          <>
            <label htmlFor={`content-${index}-ordered`} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
              <input
                id={`content-${index}-ordered`}
                type="checkbox"
                className="size-4 rounded border-navy-300 accent-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                {...register(`content.${index}.ordered` as const)}
              />
              Numbered list (ordered)
            </label>
            <div>
              <label htmlFor={`content-${index}-items`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                List items <span aria-hidden="true" className="text-error">*</span>
              </label>
              <textarea
                id={`content-${index}-items`}
                rows={4}
                placeholder={"One item per line\nAnother item"}
                aria-invalid={Boolean(blockErrors?.items)}
                aria-describedby={blockErrors?.items ? `content-${index}-items-error` : undefined}
                className={INPUT_CLASS}
                {...register(`content.${index}.items` as const)}
              />
              <BlockFieldError message={blockErrors?.items?.message} />
            </div>
          </>
        )}

        {blockType === "code" && (
          <>
            <div>
              <label htmlFor={`content-${index}-language`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                Language <span aria-hidden="true" className="text-error">*</span>
              </label>
              <input
                id={`content-${index}-language`}
                type="text"
                placeholder="ts, python, bash…"
                aria-invalid={Boolean(blockErrors?.language)}
                className={INPUT_CLASS}
                {...register(`content.${index}.language` as const)}
              />
              <BlockFieldError message={blockErrors?.language?.message} />
            </div>
            <div>
              <label htmlFor={`content-${index}-code`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                Code <span aria-hidden="true" className="text-error">*</span>
              </label>
              <textarea
                id={`content-${index}-code`}
                rows={6}
                spellCheck={false}
                aria-invalid={Boolean(blockErrors?.code)}
                className={`${INPUT_CLASS} font-mono text-[13px]`}
                {...register(`content.${index}.code` as const)}
              />
              <BlockFieldError message={blockErrors?.code?.message} />
            </div>
            <div>
              <label htmlFor={`content-${index}-caption`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                Caption
              </label>
              <input
                id={`content-${index}-caption`}
                type="text"
                className={INPUT_CLASS}
                {...register(`content.${index}.caption` as const)}
              />
            </div>
          </>
        )}

        {blockType === "callout" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`content-${index}-variant`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                  Variant <span aria-hidden="true" className="text-error">*</span>
                </label>
                <select
                  id={`content-${index}-variant`}
                  className={INPUT_CLASS}
                  {...register(`content.${index}.variant` as const)}
                >
                  <option value="takeaway">Key Takeaway</option>
                  <option value="tip">Tip</option>
                  <option value="note">Note</option>
                </select>
              </div>
              <div>
                <label htmlFor={`content-${index}-block-title`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                  Title <span aria-hidden="true" className="text-error">*</span>
                </label>
                <input
                  id={`content-${index}-block-title`}
                  type="text"
                  aria-invalid={Boolean(blockErrors?.blockTitle)}
                  className={INPUT_CLASS}
                  {...register(`content.${index}.blockTitle` as const)}
                />
                <BlockFieldError message={blockErrors?.blockTitle?.message} />
              </div>
            </div>
            <div>
              <label htmlFor={`content-${index}-text`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                Text <span aria-hidden="true" className="text-error">*</span>
              </label>
              <textarea
                id={`content-${index}-text`}
                rows={3}
                aria-invalid={Boolean(blockErrors?.text)}
                className={INPUT_CLASS}
                {...register(`content.${index}.text` as const)}
              />
              <BlockFieldError message={blockErrors?.text?.message} />
            </div>
          </>
        )}
      </div>
    </li>
  );
}

