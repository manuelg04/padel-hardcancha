import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "expire pending Mercado Pago booking holds",
  { minutes: 5 },
  internal.payments.expirePendingPaymentBookings,
);

crons.interval(
  "refresh Mercado Pago OAuth tokens",
  { hours: 12 },
  internal.payments.refreshMercadoPagoTokensCron,
);

export default crons;
