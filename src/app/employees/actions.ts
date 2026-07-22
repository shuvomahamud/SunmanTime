"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  findProfile,
  findProfileByIdentity,
} from "@/lib/db/queries";
import { profiles } from "@/lib/db/schema";
import { getNeonAuthAdmin } from "@/lib/neon-auth/admin";
import { getNeonAuth } from "@/lib/neon-auth/server";

const inviteSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  username: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .transform((value) => value.toLowerCase()),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

function employeesUrl(kind: "error" | "message", value: string) {
  return `/employees?${kind}=${encodeURIComponent(value)}`;
}

async function applicationOrigin() {
  const requestHeaders = await headers();
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? requestHeaders.get("origin") ?? ""
  ).replace(/\/$/, "");
}

export async function inviteEmployee(formData: FormData) {
  await requireAdmin();

  const parsed = inviteSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    username: formData.get("username"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirect(
      employeesUrl(
        "error",
        "Enter a valid name, username, and email address.",
      ),
    );
  }

  const existing = await findProfileByIdentity(
    parsed.data.email,
    parsed.data.username,
  );
  if (existing) {
    const duplicate =
      existing.email === parsed.data.email ? "email address" : "username";
    redirect(
      employeesUrl("error", `That ${duplicate} is already registered.`),
    );
  }

  const auth = getNeonAuth();
  const authAdmin = getNeonAuthAdmin();
  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
  const temporaryPassword = `${randomUUID()}-${randomUUID()}`;
  const { data, error } = await authAdmin.createUser({
    email: parsed.data.email,
    name: fullName,
    password: temporaryPassword,
    role: "user",
  });

  if (error || !data?.user) {
    redirect(
      employeesUrl(
        "error",
        error?.status === 403
          ? "Your administrator session cannot create users. Sign out and sign in again."
          : "That email may already have an authentication account.",
      ),
    );
  }

  const profileCreated = await getDb()
    .insert(profiles)
    .values({
      id: data.user.id,
      username: parsed.data.username,
      email: parsed.data.email,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      role: "employee",
      is_active: true,
    })
    .then(() => true)
    .catch(() => false);

  if (!profileCreated) {
    await authAdmin.removeUser({ userId: data.user.id });
    redirect(
      employeesUrl(
        "error",
        "The employee profile could not be created. No invitation was kept.",
      ),
    );
  }

  const origin = await applicationOrigin();
  const { error: emailError } = await auth.requestPasswordReset({
    email: parsed.data.email,
    redirectTo: `${origin}/reset-password`,
  });

  revalidatePath("/employees");
  redirect(
    employeesUrl(
      emailError ? "error" : "message",
      emailError
        ? "The employee was created, but the setup email failed. They can request a new link from Forgot password."
        : `Invitation sent to ${parsed.data.email}.`,
    ),
  );
}

export async function setEmployeeActive(formData: FormData) {
  await requireAdmin();

  const userId = z.string().uuid().safeParse(formData.get("userId"));
  const isActive = z.enum(["true", "false"]).safeParse(formData.get("isActive"));
  if (!userId.success || !isActive.success) {
    redirect(employeesUrl("error", "The selected employee is invalid."));
  }

  const profile = await findProfile(userId.data);
  if (!profile || profile.role !== "employee") {
    redirect(employeesUrl("error", "Only employee access can be changed here."));
  }

  const activate = isActive.data === "true";
  await getDb()
    .update(profiles)
    .set({
      is_active: activate,
      updated_at: new Date().toISOString(),
    })
    .where(eq(profiles.id, profile.id));

  revalidatePath("/employees");
  redirect(
    employeesUrl(
      "message",
      `${profile.first_name || profile.username} is now ${
        activate ? "active" : "inactive"
      }.`,
    ),
  );
}
