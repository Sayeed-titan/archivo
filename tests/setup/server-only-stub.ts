// Next.js's bundler resolves the literal import "server-only" to a no-op
// internally, without it needing to exist as a real installed package —
// that's why `lib/*.ts` can `import "server-only"` with nothing in
// node_modules/server-only. Vitest uses plain Node module resolution, so it
// needs this alias (see vitest.config.ts) to reproduce the same no-op.
export {};
