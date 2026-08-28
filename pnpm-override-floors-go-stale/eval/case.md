# Case: override floors and the selector/replacement split

**Runnable:** yes, with pnpm and network, against a throwaway fixture workspace.

## Assertions
1. With `'nanoid@>=3.0.0 <4.0.0': '>=3.3.18'`, `pnpm install` resolves nanoid to
   a **v6** version — the left-side bound did not constrain the result.
2. With `'nanoid@>=3.0.0 <4.0.0': '>=3.3.18 <4.0.0'`, it resolves inside v3.
3. Raising a floor in `pnpm-workspace.yaml` **without** re-running `pnpm install`
   leaves `pnpm-lock.yaml` unchanged — assert the lockfile hash is identical.
4. Re-running `pnpm install` changes it.

Assertions 3 and 4 are the core claim. Assertion 1 is the trap that makes the
mistake look reasonable, and is the one most likely to drift as pnpm changes,
which is why it carries the shorter staleness window.
