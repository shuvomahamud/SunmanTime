import { getNeonAuth } from "@/lib/neon-auth/server";

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

export function GET(request: Request, context: AuthRouteContext) {
  return getNeonAuth().handler().GET(request, context);
}

export async function POST(request: Request, context: AuthRouteContext) {
  const { path } = await context.params;
  if (path.join("/") === "sign-up/email") {
    return Response.json(
      { message: "Registration is invite-only." },
      { status: 403 },
    );
  }

  return getNeonAuth().handler().POST(request, context);
}
