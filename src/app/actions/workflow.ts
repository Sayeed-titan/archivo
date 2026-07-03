"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { isValidRequirement } from "@/lib/workflow/requirements";

const AddStateSchema = z.object({
  name: z.string().trim().min(1, { error: "State name is required." }),
  isInitial: z.string().optional(),
  isTerminal: z.string().optional(),
});

export type AddStateState = { message?: string } | undefined;

export async function addWorkflowState(_state: AddStateState, formData: FormData): Promise<AddStateState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage the workflow");

  const validated = AddStateSchema.safeParse({
    name: formData.get("name"),
    isInitial: formData.get("isInitial") ?? undefined,
    isTerminal: formData.get("isTerminal") ?? undefined,
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message };
  }

  const existing = await prisma.workflowState.findUnique({
    where: { organizationId_name: { organizationId: user.organizationId, name: validated.data.name } },
  });
  if (existing) {
    return { message: `A state named "${validated.data.name}" already exists.` };
  }

  const maxOrder = await prisma.workflowState.aggregate({
    where: { organizationId: user.organizationId },
    _max: { order: true },
  });

  await prisma.workflowState.create({
    data: {
      organizationId: user.organizationId,
      name: validated.data.name,
      order: (maxOrder._max.order ?? -1) + 1,
      isInitial: validated.data.isInitial === "on",
      isTerminal: validated.data.isTerminal === "on",
    },
  });

  revalidatePath("/settings/workflow");
}

// Same full-renumber pattern as reorderFolderTemplates (see
// src/app/actions/folder-templates.ts) — order values aren't guaranteed
// contiguous after past deletions, so always renumber the whole set.
export async function reorderWorkflowStates(orderedIds: string[]) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage the workflow");

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.workflowState.update({
        where: { id, organizationId: user.organizationId },
        data: { order: index },
      })
    )
  );

  revalidatePath("/settings/workflow");
}

export async function removeWorkflowState(stateId: string) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage the workflow");

  await prisma.workflowState.delete({ where: { id: stateId, organizationId: user.organizationId } });
  revalidatePath("/settings/workflow");
}

const AddTransitionSchema = z.object({
  fromState: z.string().trim().min(1),
  toState: z.string().trim().min(1),
});

export type AddTransitionState = { message?: string } | undefined;

export async function addWorkflowTransition(_state: AddTransitionState, formData: FormData): Promise<AddTransitionState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage the workflow");

  const validated = AddTransitionSchema.safeParse({
    fromState: formData.get("fromState"),
    toState: formData.get("toState"),
  });
  if (!validated.success) {
    return { message: "Pick both a from-state and a to-state." };
  }
  if (validated.data.fromState === validated.data.toState) {
    return { message: "From and to state must be different." };
  }

  const requirements = [];
  if (formData.get("req_mandatoryFolders") === "on") {
    requirements.push({ kind: "mandatoryFoldersFilled" });
  }
  for (const field of formData.getAll("req_field")) {
    requirements.push({ kind: "fieldRequired", field: String(field) });
  }
  if (!requirements.every(isValidRequirement)) {
    return { message: "Invalid requirement selection." };
  }

  const existing = await prisma.workflowTransition.findUnique({
    where: {
      organizationId_fromState_toState: {
        organizationId: user.organizationId,
        fromState: validated.data.fromState,
        toState: validated.data.toState,
      },
    },
  });
  if (existing) {
    return { message: `A transition from "${validated.data.fromState}" to "${validated.data.toState}" already exists.` };
  }

  await prisma.workflowTransition.create({
    data: {
      organizationId: user.organizationId,
      fromState: validated.data.fromState,
      toState: validated.data.toState,
      requirements,
    },
  });

  revalidatePath("/settings/workflow");
}

export async function removeWorkflowTransition(transitionId: string) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage the workflow");

  await prisma.workflowTransition.delete({ where: { id: transitionId, organizationId: user.organizationId } });
  revalidatePath("/settings/workflow");
}
