// Empty shim for the `server-only` package used by Next.js in server
// modules. In production it throws when imported from a client bundle;
// in tests we simply want to allow the import so we can exercise the
// underlying service modules directly.
export {};
