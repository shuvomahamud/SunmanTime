import "server-only";

import { getNeonAuth } from "./server";

type AdminApiError = {
  message: string;
  status: number;
  statusText: string;
  code: string;
};

type AdminApiResult<T> = Promise<{
  data: T | null;
  error: AdminApiError | null;
}>;

type NeonAuthAdminApi = {
  createUser(input: {
    email: string;
    password: string;
    name: string;
    role: "user" | "admin";
  }): AdminApiResult<{ user: { id: string } }>;
  removeUser(input: {
    userId: string;
  }): AdminApiResult<{ success: boolean }>;
};

/**
 * The Neon Auth beta SDK exposes these Better Auth admin methods at runtime,
 * but currently declares the nested `admin` property as `unknown`.
 * Keep the compatibility cast isolated here until the upstream type is fixed.
 */
export function getNeonAuthAdmin() {
  const admin = getNeonAuth().admin;
  if (!admin || typeof admin !== "object") {
    throw new Error("Neon Auth admin API is unavailable");
  }
  return admin as NeonAuthAdminApi;
}
