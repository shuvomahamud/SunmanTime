"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getNeonAuth } from "@/lib/neon-auth/server";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

const registrationSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  username: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

function messageUrl(path: string, kind: "error" | "message", value: string) {
  return `${path}?${kind}=${encodeURIComponent(value)}`;
}

function safeNext(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

async function requestOrigin() {
  const requestHeaders = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? requestHeaders.get("origin") ?? "";
}

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    redirect(messageUrl("/login", "error", "Enter a valid email and password."));
  }

  const { error } = await getNeonAuth().signIn.email({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    redirect(messageUrl("/login", "error", "Email or password is incorrect."));
  }

  redirect(safeNext(parsed.data.next));
}

export async function register(formData: FormData) {
  if (process.env.ALLOW_PUBLIC_SIGNUP !== "true") {
    redirect(
      messageUrl(
        "/register",
        "error",
        "Registration is currently invite-only. Contact an administrator.",
      ),
    );
  }

  const parsed = registrationSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(messageUrl("/register", "error", "Check every field and try again."));
  }

  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
  const { data, error } = await getNeonAuth().signUp.email({
    email: parsed.data.email,
    password: parsed.data.password,
    name: fullName,
    callbackURL: "/",
  });

  if (error || !data?.user) {
    redirect(messageUrl("/register", "error", error?.message ?? "Account creation failed."));
  }

  try {
    await getDb().insert(profiles).values({
      id: data.user.id,
      username: parsed.data.username,
      email: parsed.data.email,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
    });
  } catch {
    redirect(
      messageUrl(
        "/register",
        "error",
        "The account was created, but its employee profile needs administrator review.",
      ),
    );
  }

  redirect(messageUrl("/login", "message", "Check your email to confirm your account."));
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) {
    redirect(messageUrl("/forgot-password", "error", "Enter a valid email."));
  }

  const origin = await requestOrigin();
  await getNeonAuth().requestPasswordReset({
    email: email.data,
    redirectTo: `${origin}/reset-password`,
  });

  redirect(
    messageUrl(
      "/login",
      "message",
      "If that email exists, a password-reset link has been sent.",
    ),
  );
}

export async function updatePassword(formData: FormData) {
  const parsed = z
    .object({
      password: z.string().min(8).max(128),
      token: z.string().min(1),
    })
    .safeParse({
      password: formData.get("password"),
      token: formData.get("token"),
    });

  if (!parsed.success) {
    redirect(
      messageUrl(
        "/forgot-password",
        "error",
        "The reset link is invalid or expired. Request a new one.",
      ),
    );
  }

  const { error } = await getNeonAuth().resetPassword({
    newPassword: parsed.data.password,
    token: parsed.data.token,
  });

  if (error) {
    redirect(
      messageUrl(
        "/forgot-password",
        "error",
        "The reset link is invalid or expired. Request a new one.",
      ),
    );
  }

  redirect(messageUrl("/login", "message", "Your password has been updated."));
}

export async function logout() {
  await getNeonAuth().signOut();
  redirect("/login");
}
