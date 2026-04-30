import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import { paymentProviderEnvironmentValidator } from "../validators";

export type CheckoutPreparation = {
  clubId: Id<"clubs">;
  clubSlug: string;
  clubName: string;
  courtId: Id<"courts">;
  courtName: string;
  bookingId: Id<"bookings">;
  bookingCode: string;
  paymentId: Id<"payments">;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  localDate: string;
  startMinutes: number;
  durationMinutes: number;
  amount: number;
  expiresAt: number;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  accessTokenExpiresAt?: number;
  allowOfflineMethods: boolean;
};

export type CheckoutActionResult = {
  checkoutUrl: string;
  bookingCode: string;
  bookingId: Id<"bookings">;
  paymentId: Id<"payments">;
};

export type PendingOAuthState = {
  _id: Id<"mercadoPagoOAuthStates">;
  clubId: Id<"clubs">;
  userId: Id<"users">;
};

export type ConnectionSecret = {
  _id: Id<"mercadoPagoConnections">;
  clubId: Id<"clubs">;
  status: string;
  environment: "sandbox" | "production";
  collectorId: string;
  publicKey?: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  accessTokenExpiresAt?: number;
  liveMode: boolean;
  scope?: string;
};

export const checkoutPreparationValidator = v.object({
  clubId: v.id("clubs"),
  clubSlug: v.string(),
  clubName: v.string(),
  courtId: v.id("courts"),
  courtName: v.string(),
  bookingId: v.id("bookings"),
  bookingCode: v.string(),
  paymentId: v.id("payments"),
  customerName: v.string(),
  customerPhone: v.string(),
  customerEmail: v.optional(v.string()),
  localDate: v.string(),
  startMinutes: v.number(),
  durationMinutes: v.number(),
  amount: v.number(),
  expiresAt: v.number(),
  accessTokenEncrypted: v.string(),
  refreshTokenEncrypted: v.string(),
  accessTokenExpiresAt: v.optional(v.number()),
  allowOfflineMethods: v.boolean(),
});

export const connectionSecretValidator = v.object({
  _id: v.id("mercadoPagoConnections"),
  clubId: v.id("clubs"),
  status: v.string(),
  environment: paymentProviderEnvironmentValidator,
  collectorId: v.string(),
  publicKey: v.optional(v.string()),
  accessTokenEncrypted: v.string(),
  refreshTokenEncrypted: v.string(),
  accessTokenExpiresAt: v.optional(v.number()),
  liveMode: v.boolean(),
  scope: v.optional(v.string()),
});
