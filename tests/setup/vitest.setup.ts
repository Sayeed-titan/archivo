import { config as loadEnv } from "dotenv";

// Unit tests don't need a database, but loading .env.test here too (instead
// of only in integration-specific setup) means every Vitest file behaves
// the same regardless of which folder it lives in — one less thing to get
// wrong when moving a test between tests/unit and tests/integration.
loadEnv({ path: ".env.test" });
