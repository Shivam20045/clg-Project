import Vapi from "@vapi-ai/web";

// Guard against SSR/build-time evaluation — Vapi accesses browser globals.
// The `vapi` export is only used inside "use client" components (Agent.tsx),
// but Next.js still evaluates this module on the server during build analysis.
export const vapi: Vapi =
  typeof window !== "undefined"
    ? new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!)
    : ({} as Vapi);
