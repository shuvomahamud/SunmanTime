import type { NextRequest } from "next/server";
import { getNeonAuth } from "@/lib/neon-auth/server";

export function proxy(request: NextRequest) {
  return getNeonAuth().middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: [
    "/",
    "/employees/:path*",
    "/reports/:path*",
    "/api/reports/:path*",
  ],
};
