"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { closeClockIn, createClockIn } from "@/lib/db/queries";
import { currentWorkDate } from "@/lib/dates";

function dashboardError(message: string) {
  return `/?error=${encodeURIComponent(message)}`;
}

export async function clockIn() {
  const { id } = await requireUser();

  try {
    await createClockIn(id, currentWorkDate());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clock-in failed";
    redirect(dashboardError(message));
  }

  revalidatePath("/");
  redirect("/?message=Clock-in+recorded");
}

export async function clockOut() {
  const { id } = await requireUser();

  try {
    await closeClockIn(id, currentWorkDate());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clock-out failed";
    redirect(dashboardError(message));
  }

  revalidatePath("/");
  redirect("/?message=Clock-out+recorded");
}
