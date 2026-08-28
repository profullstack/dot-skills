# Case: client-module constant is a proxy server-side

**Runnable:** partially. The typeof guard runs under `node --test`; the render
assertion needs `next build` and a headless browser.

## Static assertion (runs anywhere)
`node --test` importing the constant from its plain module:
`typeof FILTER_FROM === 'number'`. If the constant still lives in the `.jsx`,
the import fails outright — which is the guard working, since node cannot parse
JSX.

## Render assertion
1. Server component gates a client component on `rows.length >= FILTER_FROM`,
   with the constant exported from the `'use client'` module.
2. Build and load a page where `rows.length` clearly exceeds the threshold.
3. Assert the component is **absent** from the DOM, and that the page hydrated
   anyway (`__reactFiber$` present on some node).
4. Move the constant to a plain module, rebuild, assert the component is now
   present.

Step 3 is what documents the silence. If Next ever starts warning here, this
skill is downgraded from a trap to a lint rule.
