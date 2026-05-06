import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import {
  buildMercadoPagoAuthorizationUrl,
  buildMercadoPagoOAuthResultRedirect,
  normalizeMercadoPagoOAuthRedirect,
  readMercadoPagoOAuthStartEnv,
  type MercadoPagoOAuthFailureReason,
} from "@/lib/mercadoPagoOAuthRouteRules";

export const runtime = "nodejs";

function redirectToAdminResult(
  request: NextRequest,
  reason: MercadoPagoOAuthFailureReason,
  redirectAfterSuccess?: string,
) {
  return NextResponse.redirect(
    new URL(
      buildMercadoPagoOAuthResultRedirect({
        redirectPath: redirectAfterSuccess,
        result: "error",
        reason,
      }),
      request.url,
    ),
  );
}

function redirectToAdminLogin(request: NextRequest) {
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

function startFailureReason(error: unknown): MercadoPagoOAuthFailureReason {
  if (!(error instanceof Error)) return "forbidden";
  if (error.message.includes("Debes iniciar sesion")) return "unauthorized";
  if (error.message.includes("No tienes acceso")) return "forbidden";
  return "forbidden";
}

export async function GET(request: NextRequest) {
  const token = await convexAuthNextjsToken();

  if (!token) {
    return redirectToAdminLogin(request);
  }

  const redirectAfterSuccess = normalizeMercadoPagoOAuthRedirect(
    request.nextUrl.searchParams.get("redirectAfterSuccess"),
  );
  const env = readMercadoPagoOAuthStartEnv(process.env);

  if (!env.ok) {
    return redirectToAdminResult(request, env.reason, redirectAfterSuccess);
  }

  let stateResult;

  try {
    stateResult = await fetchMutation(
      api.mercadoPagoOAuth.createMercadoPagoOAuthState,
      { redirectAfterSuccess },
      { token },
    );
  } catch (error) {
    const reason = startFailureReason(error);
    if (reason === "unauthorized") {
      return redirectToAdminLogin(request);
    }

    return redirectToAdminResult(request, reason, redirectAfterSuccess);
  }

  return NextResponse.redirect(
    buildMercadoPagoAuthorizationUrl({
      clientId: env.clientId,
      redirectUri: env.redirectUri,
      state: stateResult.state,
    }),
  );
}
