"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { useState } from "react";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ??
  "https://majestic-fennec-628.convex.cloud";

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = useState(() => new ConvexReactClient(convexUrl));

  return <ConvexAuthNextjsProvider client={client}>{children}</ConvexAuthNextjsProvider>;
}
