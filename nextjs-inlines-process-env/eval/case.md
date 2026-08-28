# Case: build-time inlining vs runtime accessor

**Runnable:** partially. The grep assertion runs anywhere; the build assertion
needs a `next build`.

## Build assertion
1. Build with `API_TOKEN` **unset**.
2. Start the server with `API_TOKEN=secret` in the environment.
3. A route reading `process.env.API_TOKEN` directly returns undefined.
4. The same route reading it via `runtimeEnv('API_TOKEN')` returns `secret`.

Assertion 3 is the one that matters: if it ever returns `secret`, Next changed
its substitution behaviour and this skill is obsolete.

## Static assertion (runs anywhere)
Grep server-side sources for `process\.env\.[A-Z_]+` excluding `NEXT_PUBLIC_`.
Every hit is a latent instance. Zero hits passes.
