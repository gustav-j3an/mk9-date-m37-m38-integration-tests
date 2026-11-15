import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/m37-m38-rc1-16-production-reconciliation.yml', import.meta.url), 'utf8');
const runner = readFileSync(new URL('./rc1-16-run-postgres17.sh', import.meta.url), 'utf8');
const appSha = 'd4f27d713f2200857ffdac1d57ca8bc50d7094fa';

test('RC1.16 workflow only runs manually or on its isolated test branch', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:\s*\n\s+branches:\s*\n\s+- codex\/rc1-16-incremental-reconciliation/);
  assert.match(workflow, /if:\s*github\.ref == 'refs\/heads\/codex\/rc1-16-incremental-reconciliation'/);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s+read/);
  assert.doesNotMatch(workflow, /^\s+(?:pull_request|schedule|deployment):/m);
  assert.doesNotMatch(workflow, /secrets\./i);
  assert.match(workflow, /persist-credentials:\s*false/);
});

test('the immutable application checkout and original migration hashes remain pinned', () => {
  assert.match(workflow, new RegExp(`ref: ${appSha}`));
  assert.match(workflow, new RegExp(`APP_SHA: ${appSha}`));
  assert.match(runner, new RegExp(`EXPECTED_APP_SHA='${appSha}'`));
  assert.match(runner, /application-migrations\.sha256/);
  assert.match(runner, /Original migration execution order/);
  assert.match(runner, /cp -R "\$APP_DIR\/supabase\/migrations"/);
  assert.doesNotMatch(runner, /rename\(|replace\(.*migration|normalize-legacy-migrations/i);
});

test('incremental phase reproduces M15/M18 baseline and applies original files without rewriting them', () => {
  assert.match(runner, /Simulating incremental upgrade from the original M15\/M18 baseline/);
  assert.match(runner, /supabase db reset --local --no-seed/);
  assert.match(runner, /cp -R "\$full_migrations_dir\/\." "\$migrations_dir\/"/);
  assert.match(runner, /supabase migration up/);
  assert.match(runner, /expected-application-versions\.txt/);
  assert.match(runner, /applied-application-versions\.txt/);
  assert.match(runner, /diff -u "\$STACK_DIR\/expected-application-versions\.txt"/);
  assert.match(runner, /before_retry_inventory.*after_retry_inventory/);
});

test('controlled interruption proves rollback of partial DDL and safe retry', () => {
  assert.match(runner, /readonly injected_version='20261106135000'/);
  assert.match(runner, /\$\{injected_version\}_rc1_16_failure_injection\.sql/);
  assert.match(runner, /CREATE TABLE public\.rc1_16_partial_ddl/);
  assert.match(runner, /SELECT 1 \/ 0/);
  assert.match(runner, /failed migration left no partial DDL/i);
  assert.match(runner, /Failed migration was recorded as applied/);
  assert.match(runner, /rm -f "\$injected_migration"\s+supabase migration up/s);
  assert.match(runner, /No-op migration retry changed the migration ledger/);
  assert.match(runner, /PGHOST=127\.0\.0\.1 PGPORT=54322/);
  assert.match(runner, /Remote Supabase credential\/configuration is present/);
  assert.doesNotMatch(runner, /supabase migration (?:repair|up)[^\n]*--remote/i);
});
