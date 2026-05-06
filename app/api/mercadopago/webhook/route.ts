import { fetchAction } from "convex/nextjs";
import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

function searchParamsObject(request: NextRequest) {
  const result: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function dataIdFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const data = "data" in payload ? (payload as { data?: unknown }).data : undefined;

  if (data && typeof data === "object" && "id" in data) {
    const id = (data as { id?: unknown }).id;
    return id === undefined || id === null ? undefined : String(id);
  }

  return undefined;
}

function parseMercadoPagoSignature(signature: string | null) {
  if (!signature) return null;
  const parts = signature.split(",");
  let ts: string | undefined;
  let v1: string | undefined;

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (key?.trim() === "ts") ts = value?.trim();
    if (key?.trim() === "v1") v1 = value?.trim();
  }

  return ts && v1 ? { ts, v1 } : null;
}

function safeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function verifyMercadoPagoWebhookSignature({
  dataId,
  requestId,
  signature,
}: {
  dataId?: string;
  requestId: string | null;
  signature: string | null;
}) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret) {
    return isProduction
      ? { ok: false as const, status: 500 }
      : { ok: true as const };
  }

  const parsed = parseMercadoPagoSignature(signature);
  if (!dataId || !requestId || !parsed) {
    return { ok: false as const, status: 401 };
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${parsed.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return safeEqualHex(expected, parsed.v1)
      ? { ok: true as const }
      : { ok: false as const, status: 401 };
  } catch {
    return { ok: false as const, status: 401 };
  }
}

async function handleWebhook(request: NextRequest, payload: unknown) {
  const query = searchParamsObject(request);
  const dataId = query["data.id"] ?? query.id ?? dataIdFromPayload(payload);
  const validSignature = verifyMercadoPagoWebhookSignature({
    dataId,
    requestId: request.headers.get("x-request-id"),
    signature: request.headers.get("x-signature"),
  });

  if (!validSignature.ok) {
    return NextResponse.json({ ok: false }, { status: validSignature.status });
  }

  try {
    await fetchAction(api.payments.processMercadoPagoWebhook, {
      query,
      payload,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let payload: unknown = {};

  try {
    const body = await request.text();
    payload = body ? JSON.parse(body) : {};
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return await handleWebhook(request, payload);
}

export async function GET(request: NextRequest) {
  return await handleWebhook(request, {});
}
