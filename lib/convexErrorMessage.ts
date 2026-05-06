export function userFacingConvexErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (!(error instanceof Error)) return fallback;

  const message = error.message.trim();
  const convexErrorPrefix = "Uncaught ConvexError:";
  const convexErrorStart = message.indexOf(convexErrorPrefix);

  if (convexErrorStart >= 0) {
    const details = message.slice(convexErrorStart + convexErrorPrefix.length).trim();
    const handlerStart = details.indexOf(" at ");
    const rawDetails =
      handlerStart >= 0 ? details.slice(0, handlerStart).trim() : details;

    try {
      const parsed = JSON.parse(rawDetails) as { message?: unknown };

      if (typeof parsed.message === "string" && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      if (rawDetails) return rawDetails;
    }
  }

  return message || fallback;
}
