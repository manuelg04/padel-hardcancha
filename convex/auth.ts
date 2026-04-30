import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";

import type { DataModel } from "./_generated/dataModel";

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const email = optionalString(params.email)?.toLowerCase();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new ConvexError("Ingresa un email valido.");
        }

        const now = Date.now();

        return {
          email,
          name: optionalString(params.name),
          phone: optionalString(params.phone),
          createdAt: now,
          updatedAt: now,
        };
      },
    }),
  ],
});
