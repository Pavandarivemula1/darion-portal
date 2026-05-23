1. Update `app.js` to change the hardcoded `let activePhaseId = 2;` to `let activePhaseId = 1;` so it defaults to M1 (DISC) initially.
2. In the `init()` function of `app.js`, ensure that if `inProgress` is not found, `activePhaseId = PHASES[0].id` is consistently applied across both Supabase and fallback paths.
3. Clean up the `status` values in the DB to remove the trailing newline (`\n`) from `"Planned\n"`, which might be causing matching issues. I will write a quick script to fix the database entries.
