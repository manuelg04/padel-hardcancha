import { fetchAction } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    const redirect = new URL("/admin/config/pagos", request.url);
    redirect.searchParams.set("mp", "error");
    return NextResponse.redirect(redirect);
  }

  try {
    await fetchAction(api.payments.completeMercadoPagoOAuth, { code, state });
    const redirect = new URL("/admin/config/pagos", request.url);
    redirect.searchParams.set("mp", "connected");
    return NextResponse.redirect(redirect);
  } catch {
    const redirect = new URL("/admin/config/pagos", request.url);
    redirect.searchParams.set("mp", "error");
    return NextResponse.redirect(redirect);
  }
}
