import "server-only";

import {
  createNeonAuth,
  type NeonAuth,
} from "@neondatabase/auth/next/server";
import { getNeonAuthEnv } from "@/lib/env";

let neonAuth: NeonAuth | undefined;

export function getNeonAuth() {
  if (!neonAuth) {
    const env = getNeonAuthEnv();
    neonAuth = createNeonAuth({
      baseUrl: env.NEON_AUTH_BASE_URL,
      cookies: {
        secret: env.NEON_AUTH_COOKIE_SECRET,
        sessionDataTtl: 300,
        sameSite: "strict",
      },
    });
  }

  return neonAuth;
}
