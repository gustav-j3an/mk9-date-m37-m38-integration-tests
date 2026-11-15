# MK9 DATE RC1.9 — M37/M38 integration harness

This public repository exists only to run the disposable PostgreSQL 17 integration suite for the published application commit `f8df53b1ffd77ea255fda1c7a663946a0b25607c`.

The manual GitHub Actions workflow checks out the application from `gustav-j3an/mk9-data` at that immutable commit, validates the source, starts a local Supabase/PostgreSQL stack on the Actions runner, runs the M37/M38 tests, and removes the stack. It has no deployment steps, secrets, project linking, or remote database calls.

Run `MK9 DATE RC1.9 M37/M38 integration (PostgreSQL 17)` manually on `main`. Standard GitHub-hosted runners are free for public repositories. This repository is not connected to Vercel.
