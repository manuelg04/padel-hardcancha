import { fetchAction, fetchMutation } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import {
  buildMercadoPagoOAuthResultRedirect,
  getMercadoPagoOAuthCallbackFailure,
  readMercadoPagoOAuthCallbackEnv,
  type MercadoPagoOAuthFailureReason,
} from "@/lib/mercadoPagoOAuthRouteRules";

export const runtime = "nodejs";

function redirectToResult(
  request: NextRequest,
  args:
    | {
        result: "success";
        redirectAfterSuccess?: string;
      }
    | {
        result: "error";
        reason: MercadoPagoOAuthFailureReason;
        redirectAfterSuccess?: string;
      },
) {
  return NextResponse.redirect(
    new URL(
      args.result === "success"
        ? buildMercadoPagoOAuthResultRedirect({
            redirectPath: args.redirectAfterSuccess,
            result: "success",
          })
        : buildMercadoPagoOAuthResultRedirect({
            redirectPath: args.redirectAfterSuccess,
            result: "error",
            reason: args.reason,
          }),
      request.url,
    ),
  );
}

async function recordCallbackError(args: {
  state: string | null;
  errorCode: string;
  errorMessage: string;
}) {
  if (!args.state) return;

  try {
    await fetchMutation(api.mercadoPagoOAuth.recordMercadoPagoOAuthCallbackError, {
      state: args.state,
      errorCode: args.errorCode,
      errorMessage: args.errorMessage,
    });
  } catch {
    return;
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const state = params.get("state")?.trim() || null;
  const failure = getMercadoPagoOAuthCallbackFailure(params);

  if (failure) {
    await recordCallbackError({
      state,
      errorCode: failure.errorCode ?? failure.reason,
      errorMessage: failure.errorMessage ?? failure.reason,
    });

    return redirectToResult(request, {
      result: "error",
      reason: failure.reason,
    });
  }

  const env = readMercadoPagoOAuthCallbackEnv(process.env);

  if (!env.ok) {
    await recordCallbackError({
      state,
      errorCode: env.reason,
      errorMessage: env.reason,
    });

    return redirectToResult(request, {
      result: "error",
      reason: env.reason,
    });
  }

  try {
    const result = await fetchAction(
      api.mercadoPagoOAuth.completeMercadoPagoOAuthCallback,
      {
        code: params.get("code")!.trim(),
        state: state!,
        redirectUri: env.redirectUri,
      },
    );

    if (result.ok) {
      return redirectToResult(request, {
        result: "success",
        redirectAfterSuccess: result.redirectAfterSuccess,
      });
    }

    return redirectToResult(request, {
      result: "error",
      reason: result.reason,
      redirectAfterSuccess: result.redirectAfterSuccess,
    });
  } catch {
    await recordCallbackError({
      state,
      errorCode: "token_exchange_failed",
      errorMessage: "token_exchange_failed",
    });

    return redirectToResult(request, {
      result: "error",
      reason: "token_exchange_failed",
    });
  }
}
