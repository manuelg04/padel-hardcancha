/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as clubs from "../clubs.js";
import type * as courts from "../courts.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as mercadoPagoClient from "../mercadoPagoClient.js";
import type * as mercadoPagoCrypto from "../mercadoPagoCrypto.js";
import type * as payments from "../payments.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  auth: typeof auth;
  bookings: typeof bookings;
  clubs: typeof clubs;
  courts: typeof courts;
  crons: typeof crons;
  http: typeof http;
  mercadoPagoClient: typeof mercadoPagoClient;
  mercadoPagoCrypto: typeof mercadoPagoCrypto;
  payments: typeof payments;
  seed: typeof seed;
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
