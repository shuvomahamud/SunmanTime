import { cache } from "react";
import { redirect } from "next/navigation";
import { findProfile } from "@/lib/db/queries";
import { getNeonAuth } from "@/lib/neon-auth/server";

export const requireUser = cache(async () => {
  const { data: session, error } = await getNeonAuth().getSession();
  const user = session?.user;

  if (error || !user) redirect("/login");

  const profile = await findProfile(user.id);
  if (!profile?.is_active) redirect("/account-disabled");

  return {
    id: user.id,
    email: user.email,
    profile,
  };
});

export async function requireAdmin() {
  const session = await requireUser();
  if (session.profile.role !== "admin") redirect("/");
  return session;
}
