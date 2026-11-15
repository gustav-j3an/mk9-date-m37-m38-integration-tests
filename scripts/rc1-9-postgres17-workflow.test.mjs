import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/m37-m38-rc1-9-postgres17.yml', import.meta.url), 'utf8');
const runner = readFileSync(new URL('./rc1-9-run-postgres17.sh', import.meta.url), 'utf8');
const appSha = 'a5419b60229e0c9fcd28f47c32b576f1713129c1';

test('RC1.14 workflow is manual-only, read-only on GitHub, and restricted to the isolated test branch', () => {
  assert.match(workflow, /\bon:\s*\n\s+workflow_dispatch:\s*(?:\n|$)/);
  assert.doesNotMatch(workflow, /^\s+(?:push|pull_request|schedule):/m);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s+read/);
  assert.match(workflow, /if:\s*github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/codex\/rc1-14-original-migrations'/);
  assert.match(workflow, /runs-on:\s*ubuntu-latest/);
  assert.match(workflow, /node-version:\s*22\.16\.0/);
  assert.match(workflow, /persist-credentials:\s*false/);
});

test('RC1.14 checkout pins the application commit separately from the harness commit', () => {
  assert.match(workflow, new RegExp(`ref: ${appSha}`));
  assert.match(workflow, /Harness workflow SHA: \$GITHUB_SHA/);
  assert.match(runner, new RegExp(`EXPECTED_APP_SHA='${appSha}'`));
  assert.match(runner, /git -C "\$APP_DIR" rev-parse HEAD/);
  assert.match(runner, /application-migrations\.sha256/);
  assert.match(runner, /harness-bootstrap\.sha256/);
  assert.doesNotMatch(runner, /normalize-legacy-migrations|migration-order-normalization/);
  assert.match(runner, /Use the application's original migration files and names unchanged/);
  assert.match(runner, /Validated .* original migrations with unique 14-digit versions/);
});

test('RC1.14 never links or resets a remote project and refuses non-loopback targets', () => {
  assert.doesNotMatch(workflow, /\bsecrets\./i);
  assert.match(workflow, /DATABASE_URL DB_URL POSTGRES_URL API_URL/);
  assert.doesNotMatch(runner, /supabase\s+(?:link|db\s+push|migration\s+up\s+--linked)/i);
  assert.match(runner, /PGSERVICEFILE=\/dev\/null PGPASSFILE=\/dev\/null/);
  assert.match(runner, /supabase db reset --local --no-seed/);
  assert.match(runner, /Refusing a non-local Supabase API URL/);
  assert.match(runner, /PGHOST=127\.0\.0\.1 PGPORT=54322/);
  assert.match(runner, /EXPECTED_STACK_DIR/);
  assert.match(runner, /20260929000000_rc1_14_test_enable_pg_cron\.sql/);
  assert.match(runner, /sha256sum "\$\{migration_files\[@\]\}"/);
  assert.match(runner, /Original migration execution order/);
});

test('RC1.14 runs application, M37, M38, and cron tests then stops the temporary stack', () => {
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /rc1-9-indicator-m37\.test\.mjs/);
  assert.match(workflow, /RC1_APP_DIR=/);
  assert.match(runner, /m37-functional-tests\.mjs/);
  assert.match(runner, /m38-functional-tests\.mjs/);
  assert.match(runner, /m38-cron-idempotence\.sql/);
  assert.match(workflow, /supabase stop --no-backup/);
});
