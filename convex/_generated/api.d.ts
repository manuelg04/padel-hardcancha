/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as academy from "../academy.js";
import type * as access from "../access.js";
import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as clubSetup from "../clubSetup.js";
import type * as clubs from "../clubs.js";
import type * as courts from "../courts.js";
import type * as http from "../http.js";
import type * as memberships from "../memberships.js";
import type * as mercadoPagoClient from "../mercadoPagoClient.js";
import type * as mercadoPagoOAuth from "../mercadoPagoOAuth.js";
import type * as mercadoPagoOAuthClient from "../mercadoPagoOAuthClient.js";
import type * as metrics from "../metrics.js";
import type * as payments from "../payments.js";
import type * as secretCrypto from "../secretCrypto.js";
import type * as seed from "../seed.js";
import type * as settlements from "../settlements.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  academy: typeof academy;
  access: typeof access;
  auth: typeof auth;
  bookings: typeof bookings;
  clubSetup: typeof clubSetup;
  clubs: typeof clubs;
  courts: typeof courts;
  http: typeof http;
  memberships: typeof memberships;
  mercadoPagoClient: typeof mercadoPagoClient;
  mercadoPagoOAuth: typeof mercadoPagoOAuth;
  mercadoPagoOAuthClient: typeof mercadoPagoOAuthClient;
  metrics: typeof metrics;
  payments: typeof payments;
  secretCrypto: typeof secretCrypto;
  seed: typeof seed;
  settlements: typeof settlements;
  users: typeof users;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
