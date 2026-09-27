import type { Request, RequestHandler, Response } from "express";

import { withErrorBoundary } from "../content/content.controller.js";
import { categoryFieldErrors, categoryRenameSchema, categorySectionSchema, categoryNameSchema } from "../../http/categorySchemas.js";
import {
  addCategory,
  deleteCategory,
  listCategories,
  renameCategory,
} from "../../repositories/content/categoriesRepository.js";
import { changedFields, recordAudit } from "../../audit/auditLogger.js";
import type { CategorySection } from "../../content/types.js";

/**
 * Admin category vocabulary controllers (Phase 10C) — /api/admin/categories.
 *
 * The route layer has already enforced panel access AND the section's CMS
 * permission (requireAdminOrPermission per section prefix), so every request
 * here carries a verified admin/manage session scoped to THIS section.
 *
 * Response contracts (existing API convention preserved):
 *   list    → 200 { data: { section, categories: [{ id, name }] } }
 *   add     → 201 same envelope
 *   rename  → 200 same envelope (content documents rewritten server-side)
 *   delete  → 200 same envelope, or 409 while the name is still in use
 *   errors  → 400 { message, errors } · 404 unknown id · 409 duplicate/in-use
 */

type SectionPayload = { section: CategorySection; categories: { id: string; name: string }[] };

function parseSection(raw: string | string[] | undefined): CategorySection | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = categorySectionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** GET /api/admin/categories/:section — ordered vocabulary for the picker. */
export const listAdminCategories: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const section = parseSection(req.params.section);
    if (!section) {
      res.status(400).json({ message: "Unknown category section." });
      return;
    }
    const categories = await listCategories(section);
    const payload: SectionPayload = { section, categories };
    res.status(200).json({ data: payload });
  },
  "admin-categories",
);

/** POST /api/admin/categories/:section — add one name to the vocabulary. */
export const addAdminCategory: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const section = parseSection(req.params.section);
    if (!section) {
      res.status(400).json({ message: "Unknown category section." });
      return;
    }
    const parsed = categoryNameSchema.safeParse(req.body?.name);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: categoryFieldErrors(parsed.error) });
      return;
    }

    const result = await addCategory(section, parsed.data);
    if (!result.ok) {
      if (result.reason === "limit") {
        res.status(409).json({
          message: "This section already has the maximum number of categories.",
          errors: { name: "Remove an unused category before adding another." },
        });
        return;
      }
      res.status(409).json({
        message: "This category already exists in this section.",
        errors: { name: "A category with this name already exists here." },
      });
      return;
    }

    await recordAudit(req, {
      action: "category.added",
      resourceType: "category",
      resourceId: `${section}:*`,
      resourceLabel: parsed.data,
      metadata: { section },
    });
    res.status(201).json({ data: { section, categories: result.categories } });
  },
  "admin-categories",
);

/** PATCH /api/admin/categories/:section/:id — rename + rewrite content. */
export const renameAdminCategory: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const section = parseSection(req.params.section);
    if (!section) {
      res.status(400).json({ message: "Unknown category section." });
      return;
    }
    const idParam = req.params.id;
    const id = (Array.isArray(idParam) ? idParam[0] : idParam)?.trim() ?? "";
    if (!id || id.length > 64) {
      res.status(404).json({ message: "Category not found." });
      return;
    }
    const parsed = categoryRenameSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Please fix the highlighted fields.", errors: categoryFieldErrors(parsed.error) });
      return;
    }

    const result = await renameCategory(section, id, parsed.data.name);
    if (!result.ok) {
      if (result.reason === "not_found") {
        res.status(404).json({ message: "Category not found." });
        return;
      }
      res.status(409).json({
        message: "This category already exists in this section.",
        errors: { name: "A category with this name already exists here." },
        ...(result.categories ? { data: { section, categories: result.categories } } : {}),
      });
      return;
    }

    await recordAudit(req, {
      action: "category.renamed",
      resourceType: "category",
      resourceId: id,
      resourceLabel: parsed.data.name,
      metadata: { section, fields: changedFields(parsed.data), rewritten: result.rewritten ?? 0 },
    });
    res.status(200).json({ data: { section, categories: result.categories } });
  },
  "admin-categories",
);

/** DELETE /api/admin/categories/:section/:id — only while unused by content. */
export const deleteAdminCategory: RequestHandler = withErrorBoundary(
  async (req: Request, res: Response) => {
    const section = parseSection(req.params.section);
    if (!section) {
      res.status(400).json({ message: "Unknown category section." });
      return;
    }
    const idParam = req.params.id;
    const id = (Array.isArray(idParam) ? idParam[0] : idParam)?.trim() ?? "";
    if (!id || id.length > 64) {
      res.status(404).json({ message: "Category not found." });
      return;
    }

    const result = await deleteCategory(section, id);
    if (!result.ok) {
      if (result.reason === "not_found") {
        res.status(404).json({ message: "Category not found." });
        return;
      }
      res.status(409).json({
        message: `This category is still used by ${result.inUse ?? 1} item(s) — reassign them first.`,
        errors: { name: "In use — the category cannot be removed while content references it." },
      });
      return;
    }

    await recordAudit(req, {
      action: "category.deleted",
      resourceType: "category",
      resourceId: id,
      metadata: { section },
    });
    res.status(200).json({ data: { section, categories: result.categories } });
  },
  "admin-categories",
);
