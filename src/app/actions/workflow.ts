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

  const isInitial = validated.data.isInitial === "on";
  const isTerminal = validated.data.isTerminal === "on";

  if (isInitial && isTerminal) {
    return { message: "A state can't be both initial and terminal." };
  }

  // Initial is pinned first and terminal states are pinned last in the
  // sequence (enforced by the drag-reorder UI too) — a newly added state
  // must be inserted at the matching end, and only one initial state is
  // allowed (multiple terminal states are fine — e.g. Archived vs Rejected).
  if (isInitial) {
    const existingInitial = await prisma.workflowState.findFirst({
      where: { organizationId: user.organizationId, isInitial: true },
    });
    if (existingInitial) {
      return { message: `"${existingInitial.name}" is already the initial state.` };
    }
  }

  await prisma.$transaction(async (tx) => {
    if (isInitial) {
      // Shift every existing state down one slot so the new initial state can take order 0.
      await tx.workflowState.updateMany({
        where: { organizationId: user.organizationId },
        data: { order: { increment: 1 } },
      });
      await tx.workflowState.create({
        data: { organizationId: user.organizationId, name: validated.data.name, order: 0, isInitial: true, isTerminal: false },
      });
      return;
    }

    const maxOrder = await tx.workflowState.aggregate({
      where: { organizationId: user.organizationId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    if (isTerminal) {
      await tx.workflowState.create({
        data: { organizationId: user.organizationId, name: validated.data.name, order: nextOrder, isInitial: false, isTerminal: true },
      });
      return;
    }

    // Non-pinned state: append before any terminal states so terminal stays last.
    const terminalStates = await tx.workflowState.findMany({
      where: { organizationId: user.organizationId, isTerminal: true },
      orderBy: { order: "asc" },
    });
    if (terminalStates.length === 0) {
      await tx.workflowState.create({
        data: { organizationId: user.organizationId, name: validated.data.name, order: nextOrder, isInitial: false, isTerminal: false },
      });
      return;
    }
    const insertAt = terminalStates[0].order;
    await tx.workflowState.updateMany({
      where: { organizationId: user.organizationId, order: { gte: insertAt } },
      data: { order: { increment: 1 } },
    });
    await tx.workflowState.create({
      data: { organizationId: user.organizationId, name: validated.data.name, order: insertAt, isInitial: false, isTerminal: false },
    });
  });

  revalidatePath("/settings/workflow");
}

const UpdateStateSchema = z.object({
  name: z.string().trim().min(1, { error: "State name is required." }),
  isInitial: z.string().optional(),
  isTerminal: z.string().optional(),
});

export type UpdateStateState = { message?: string } | undefined;

// Renaming a state must cascade: WorkflowTransition.fromState/toState and
// Archive.status are plain strings matched against WorkflowState.name (see
// the schema comment on WorkflowState), not foreign keys — so a rename that
// only touched the WorkflowState row would silently orphan every transition
// and leave existing archives' status unresolvable against the new name.
export async function updateWorkflowState(stateId: string, _state: UpdateStateState, formData: FormData): Promise<UpdateStateState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage the workflow");

  const validated = UpdateStateSchema.safeParse({
    name: formData.get("name"),
    isInitial: formData.get("isInitial") ?? undefined,
    isTerminal: formData.get("isTerminal") ?? undefined,
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message };
  }

  const current = await prisma.workflowState.findUnique({ where: { id: stateId, organizationId: user.organizationId } });
  if (!current) {
    return { message: "That state no longer exists." };
  }

  const isInitial = validated.data.isInitial === "on";
  const isTerminal = validated.data.isTerminal === "on";
  if (isInitial && isTerminal) {
    return { message: "A state can't be both initial and terminal." };
  }

  if (validated.data.name !== current.name) {
    const clash = await prisma.workflowState.findUnique({
      where: { organizationId_name: { organizationId: user.organizationId, name: validated.data.name } },
    });
    if (clash) {
      return { message: `A state named "${validated.data.name}" already exists.` };
    }
  }

  if (isInitial && !current.isInitial) {
    const existingInitial = await prisma.workflowState.findFirst({
      where: { organizationId: user.organizationId, isInitial: true },
    });
    if (existingInitial) {
      return { message: `"${existingInitial.name}" is already the initial state.` };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.workflowState.update({
      where: { id: stateId },
      data: { name: validated.data.name, isInitial, isTerminal },
    });

    if (validated.data.name !== current.name) {
      await tx.workflowTransition.updateMany({
        where: { organizationId: user.organizationId, fromState: current.name },
        data: { fromState: validated.data.name },
      });
      await tx.workflowTransition.updateMany({
        where: { organizationId: user.organizationId, toState: current.name },
        data: { toState: validated.data.name },
      });
      await tx.archive.updateMany({
        where: { organizationId: user.organizationId, status: current.name },
        data: { status: validated.data.name },
      });
    }
  });

  revalidatePath("/settings/workflow");
}

// Copies a state as a starting point for a new one. Always created as a
// plain (non-initial, non-terminal) state regardless of the source's flags —
// initial must stay unique and duplicating a terminal state would need a
// distinct name anyway, so there's no meaningful "duplicate the pin" case;
// the user can promote it via Edit afterwards if that's really what they want.
export async function duplicateWorkflowState(stateId: string) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage the workflow");

  const source = await prisma.workflowState.findUnique({ where: { id: stateId, organizationId: user.organizationId } });
  if (!source) return;

  let name = `${source.name} (copy)`;
  let suffix = 2;
  while (
    await prisma.workflowState.findUnique({
      where: { organizationId_name: { organizationId: user.organizationId, name } },
    })
  ) {
    name = `${source.name} (copy ${suffix})`;
    suffix += 1;
  }

  await prisma.$transaction(async (tx) => {
    const terminalStates = await tx.workflowState.findMany({
      where: { organizationId: user.organizationId, isTerminal: true },
      orderBy: { order: "asc" },
    });

    if (terminalStates.length === 0) {
      const maxOrder = await tx.workflowState.aggregate({
        where: { organizationId: user.organizationId },
        _max: { order: true },
      });
      await tx.workflowState.create({
        data: { organizationId: user.organizationId, name, order: (maxOrder._max.order ?? -1) + 1, isInitial: false, isTerminal: false },
      });
      return;
    }

    const insertAt = terminalStates[0].order;
    await tx.workflowState.updateMany({
      where: { organizationId: user.organizationId, order: { gte: insertAt } },
      data: { order: { increment: 1 } },
    });
    await tx.workflowState.create({
      data: { organizationId: user.organizationId, name, order: insertAt, isInitial: false, isTerminal: false },
    });
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
  if (formData.get("req_folderTypeCounts") === "on") {
    requirements.push({ kind: "folderTypeCountsSatisfied" });
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
