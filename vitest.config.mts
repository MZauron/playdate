import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside a server build; tests run in Node, so it is an empty module here.
      "server-only": fileURLToPath(new URL("./src/lib/server-only.stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Placeholders so modules that read src/env.ts load in tests. Nothing here is a real key.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54521",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      PHONE_HASH_KEY: "test-phone-hash-key-0123456789abcdef",
    },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "supabase/tests/**/*.test.ts"],
    // The database tests (supabase/tests) talk to a real Postgres; give them room.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
