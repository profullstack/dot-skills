# Case: jobId colon rule and dedupe collapse

**Runnable:** no — requires Redis.

## Assertions
1. `queue.add('t', {}, { jobId: 'a:b' })` rejects with `Custom Id cannot contain :`.
2. `queue.add('t', {}, { jobId: 'a:b:c:d' })` rejects the same way.
3. `queue.add('t', {}, { jobId: 'a:b:c' })` resolves. (The three-part carve-out
   is what makes the convention look sound; assert it or the rule reads as
   "never use colons" and the real hazard is missed.)
4. Adding twice with the same jobId returns the same job id and enqueues once.
5. A completed job inside `removeOnComplete.age` still suppresses a re-add.

## Static half, runnable anywhere
Grep every `jobId:` template literal in the codebase and assert: no `:`, and at
least one `${}` interpolation remains. This catches the collapse regression that
assertion 4 cannot distinguish from correct behaviour.
