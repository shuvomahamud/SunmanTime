"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getNeonAuth } from "@/lib/neon-auth/server";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  next: z.string().optional(),
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
