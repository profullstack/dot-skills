# Case: undefined binds locally, throws remotely

**Runnable:** no — requires a remote libSQL URL and auth token.

## Setup
Two clients over the same schema: one `file::memory:`, one `https://<db>`.

## Assertions
1. `local.execute({ sql: 'select ?', args: [undefined] })` resolves, value is null.
2. `remote.execute({ sql: 'select ?', args: [undefined] })` rejects with
   `TypeError: Unsupported type of value`.
3. `remote.execute({ sql: 'select ?', args: [{a:1}] })` **resolves** — objects
   are stringified, not rejected. (Guards the over-broad reading of this skill.)
4. The rejection message contains no column name. (This is the misleading part;
   assert it so the skill stays honest about why it is hard to diagnose.)

## Passes when
All four hold. Assertion 3 failing means the client changed and the skill's
scope needs narrowing.
