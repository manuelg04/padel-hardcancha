import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = await convexAuthNextjsToken();

  if (!token) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", "/admin/config/pagos");
    return NextResponse.redirect(url);
  }

  try {
    const state = randomBytes(32).toString("base64url");
    const result = await fetchMutation(
      api.payments.startMercadoPagoOAuth,
      { state },
      { token },
    );

    return NextResponse.redirect(result.authUrl);
  } catch {
    const url = new URL("/admin/config/pagos", request.url);
    url.searchParams.set("mp", "error");
    return NextResponse.redirect(url);
  }
}
