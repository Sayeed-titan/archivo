"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { REPORT_FIELDS } from "@/lib/reports/fields";
import { parseFilters, type ReportFilter } from "@/lib/reports/filters";

const SaveTemplateSchema = z.object({
  name: z.string().trim().min(1, { error: "Report name is required." }),
  description: z.string().trim().optional(),
  fields: z.array(z.string()).min(1, { error: "Pick at least one field." }),
  filters: z.array(
    z.object({
      field: z.string(),
      operator: z.enum(["equals", "contains", "gte", "lte", "gt", "lt"]),
      value: z.string(),
    })
  ),
});

export type SaveTemplateState = { message?: string } | undefined;

export async function saveReportTemplate(_state: SaveTemplateState, formData: FormData): Promise<SaveTemplateState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canGenerateReport", "create report templates");

  const fields = formData.getAll("fields").map(String);
  const filtersRaw = formData.get("filtersJson");
  let filters: ReportFilter[] = [];
  try {
    filters = parseFilters(JSON.parse(String(filtersRaw ?? "[]")));
  } catch {
    filters = [];
  }

  const validFieldKeys = new Set(REPORT_FIELDS.map((f) => f.key));
  const validated = SaveTemplateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    fields: fields.filter((f) => validFieldKeys.has(f)),
    filters,
  });

  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Invalid report definition." };
  }

  const { name, description, fields: validFields, filters: validFilters } = validated.data;

  const existing = await prisma.reportTemplate.findUnique({
    where: { organizationId_name: { organizationId: user.organizationId, name } },
  });
  if (existing) {
    return { message: `A report template named "${name}" already exists.` };
  }

  const template = await prisma.reportTemplate.create({
    data: {
      organizationId: user.organizationId,
      name,
      description,
      fields: validFields,
      filters: validFilters,
      createdById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "create",
      entityType: "ReportTemplate",
      entityId: template.id,
    },
  });

  redirect(`/reports/${template.id}`);
}

export async function deleteReportTemplate(templateId: string) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canGenerateReport", "delete report templates");

  const template = await prisma.reportTemplate.findFirst({
    where: { id: templateId, organizationId: user.organizationId },
  });
  if (!template) return;
  if (template.isSystemDefault) {
    throw new Error("Default report templates cannot be deleted.");
  }

  await prisma.reportTemplate.delete({ where: { id: templateId } });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "delete",
      entityType: "ReportTemplate",
      entityId: templateId,
    },
  });

  revalidatePath("/reports");
}
