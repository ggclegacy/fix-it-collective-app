import { NextResponse } from "next/server";
import { ZodError } from "zod";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const localDevelopmentOrigin =
    process.env.NODE_ENV === "development" &&
    ["127.0.0.1", "localhost"].includes(requestUrl.hostname)
      ? [requestUrl.origin]
      : [];
  const allowedOrigins = [
    ...(process.env.APP_ORIGIN ? [new URL(process.env.APP_ORIGIN).origin] : []),
    ...localDevelopmentOrigin,
  ];
  if (!origin || !allowedOrigins.includes(origin))
    throw new Error("Request origin not allowed.");
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("JSON request required.");
}
export async function endpoint(fn: () => unknown | Promise<unknown>) {
  try {
    if (process.env.VERCEL) {
      return NextResponse.json(
        { error: "Online booking and accounts are not open yet." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(await fn(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    const message =
      e instanceof ZodError
        ? e.issues[0]?.message
        : e instanceof Error
          ? e.message
          : "Unable to complete this request.";
    const safe = message?.includes("UNIQUE constraint")
      ? "An account already exists with that email."
      : message?.includes("SQLITE")
        ? "Unable to save your changes. Please try again."
        : message;
    return NextResponse.json(
      { error: safe },
      {
        status: message?.includes("sign in")
          ? 401
          : message?.includes("Staff access")
            ? 403
            : 400,
      },
    );
  }
}
