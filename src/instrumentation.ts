// Runs once at server boot, so a bad environment stops the app immediately.
export async function register() {
  await import("@/env");
}
