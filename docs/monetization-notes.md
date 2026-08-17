# Monetization notes

Captured 2026-08-16 after fixing the `programmes` RLS hole and discussing
whether/how this app could become a product instead of a personal tool.
Not a plan, not a commitment — reference for when this question comes up
again.

## What's worth keeping if we ever build "v2" from scratch

- **Postgres RLS as the entire authorization layer.** No hand-rolled API
  auth checks to get wrong per-endpoint — the database enforces it once.
- **The ownership pattern from `foods`**: `user_id IS NULL` = shared/
  curated, `user_id = auth.uid()` = private and editable. This is the
  same primitive any "public template + private customization" product
  needs (recipes, budgets, workouts, forms). Worth treating as a
  reusable building block, not one-off schema.
- **Snapshotting computed values at write time.** `food_logs` stores
  `protein_g`/`kcal`/`food_name` at the moment of logging instead of
  always joining live to `foods`. Means editing a shared/curated food
  later can't silently corrupt historical logs. Get this right early —
  it's a common thing to get wrong and have to retrofit painfully.

## What we'd change starting over

1. **TypeScript from commit one**, specifically so `supabase gen types
   typescript` turns the schema *and* the RLS model into something the
   compiler checks. The `programmes` ownership hole (no `user_id`, blanket
   `authenticated` policy letting any signed-in account edit/delete any
   programme) existed because the ownership pattern was applied to `foods`
   but not consistently to every other curated table. A generated
   `Database` type plus a lint rule ("every table with `user_id` needs a
   matching own-row policy") would catch that class of bug automatically
   instead of relying on someone reading SQL by hand.
2. **Decide the tenancy shape before writing schema, not after.** One
   shared Postgres helper (`is_owner(user_id)`, later `is_curator()`)
   that every curated table's policies call, so the pattern can't drift
   per-table again.
3. **Pick the monetizable wedge deliberately — don't build a personal
   tool and hope it generalizes.** This app is one person's macros, one
   person's programme, one person's reminders. "Yet another fitness
   tracker" is a saturated market against well-funded incumbents
   (MyFitnessPal, Hevy, Strong); being well-architected isn't a
   distribution strategy.

## The two wedges that actually reuse this architecture

Both reuse the curator/member ownership split already designed for
`foods` (and now `programmes`) — the split isn't hypothetical, it already
exists in the schema.

- **(a) Coach/client tool** — a real coach manages N clients' programmes
  and nutrition targets; clients pay for the coaching relationship, the
  app is the delivery mechanism. Needs an org/membership layer on top of
  what exists (a coach needs to write to *specific clients'* rows, not
  just their own) — this is exactly the "org-based multi-tenant" shape
  flagged as premature for "small," but it's the right shape if this is
  the direction.
- **(b) Template marketplace** — verified curators publish programmes/
  meal plans; users fork (copy-to-mine, same mechanic discussed for
  preloaded foods) and customize; curators get paid per fork/subscriber.

**Recommendation if either is pursued: (a).** Coaches already charge for
this relationship today via spreadsheets and WhatsApp — there's an
existing willingness to pay, and "curator writes the plan, member follows
and logs against it" becomes the actual product instead of a permissions
afterthought.

## Infra

Cloudflare Pages + Supabase free tier is the right stack to validate
demand — cheap, real auth, real Postgres, no ops. Don't build dedicated
multi-tenant infra (schema-per-org, etc.) before there's a second paying
customer to justify it.
