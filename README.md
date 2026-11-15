# MK9 DATE RC1.9 — M37/M38 integration harness

This public repository exists only to run the disposable PostgreSQL 17 integration suite for the published application commit `f8df53b1ffd77ea255fda1c7a663946a0b25607c`.

The manual GitHub Actions workflow checks out the application from `gustav-j3an/mk9-data` at that immutable commit, validates the source, starts a local Supabase/PostgreSQL stack on the Actions runner, runs the M37/M38 tests, and removes the stack. It has no deployment steps, secrets, project linking, or remote database calls.

The pinned application snapshot contains legacy migration files with duplicate date-only versions and one same-version dependency conflict (`profiles` is created after a migration that alters it). For this disposable test copy only, the harness assigns unique 14-digit versions and orders the `2026-09-30` files by dependency; SQL contents and the application checkout remain unchanged. The workflow records source migration hashes and every filename mapping. This normalization lets functional M37/M38 scenarios run but does not certify that the original migration ledger can be reset unchanged.

Run `MK9 DATE RC1.9 M37/M38 integration (PostgreSQL 17)` manually on `main`. Standard GitHub-hosted runners are free for public repositories. This repository is not connected to Vercel.
