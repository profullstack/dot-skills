# Case: widening CSP does not admit an http frame

**Runnable:** yes, with headless Chrome and a local https origin. Not yet run.

## Assertions
1. Serve an https page with `frame-src https:` embedding an `http://` frame.
   Console shows a **CSP** violation.
2. Widen to `frame-src https: http:` and reload. The frame is **still blocked**,
   and the console now shows a **mixed-content** violation instead.
   This is the whole skill: assertion 2 failing means the browser changed.
3. Point the same frame at the https twin. It loads under the *original*
   narrow policy.

## Companion assertion for the fix
The server-side probe returns the https URL when the twin answers < 400, and
returns the original http URL when the twin refuses the connection — within the
configured timeout, asserted with a deliberately dead https host.
