import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/m37-m38-rc1-15-migration-reconciliation.yml', import.meta.url), 'utf8');
const runner = readFileSync(new URL('./rc1-9-run-postgres17.sh', import.meta.url), 'utf8');
const inventory = readFileSync(new URL('./rc1-15-regularization-inventory.sql', import.meta.url), 'utf8');
const appSha = 'd4f27d713f2200857ffdac1d57ca8bc50d7094fa';

test('RC1.15 integration is isolated to manual dispatch and its dedicated test branch', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:\s*\n\s+branches:\s*\n\s+- codex\/rc1-15-ledger-reconciliation/);
  assert.doesNotMatch(workflow, /^\s+(?:pull_request|schedule):/m);
  assert.match(workflow, /if:\s*github\.ref == 'refs\/heads\/codex\/rc1-15-ledger-reconciliation'/);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s+read/);
  assert.match(workflow, /runs-on:\s*ubuntu-latest/);
  assert.doesNotMatch(workflow, /secrets\./i);
});

test('RC1.15 tests the immutable application commit and verifies migration hashes', () => {
  assert.match(workflow, new RegExp(`ref: ${appSha}`));
  assert.match(workflow, new RegExp(`APP_SHA: ${appSha}`));
  assert.match(runner, new RegExp(`EXPECTED_APP_SHA='${appSha}'`));
  assert.match(runner, /application-migrations\.sha256/);
  assert.match(runner, /Original application migration SHA-256 entries/);
  assert.match(runner, /Original migration execution order/);
  assert.doesNotMatch(runner, /normalize-legacy-migrations|migration-order-normalization/);
});

test('RC1.15 replays the original migration locally and fails on any schema/data drift', () => {
  assert.match(runner, /supabase db reset --local --no-seed/);
  assert.match(runner, /20261030160000_minimal_visit_regularization\.sql/);
  assert.match(runner, /before_inventory=.*inventory_sql/);
  assert.match(runner, /psql .*regularization_migration/);
  assert.match(runner, /after_inventory=.*inventory_sql/);
  assert.match(runner, /before_inventory.*after_inventory/);
  assert.match(inventory, /pg_get_constraintdef/);
  assert.match(inventory, /pg_get_triggerdef/);
  assert.match(inventory, /pg_get_functiondef/);
  assert.match(inventory, /pg_policies/);
  assert.match(inventory, /row-count/);
});

test('RC1.15 remains disconnected from remote Supabase and runs M37/M38 afterward', () => {
  assert.match(runner, /Remote Supabase credential\/configuration is present/);
  assert.match(runner, /PGHOST=127\.0\.0\.1 PGPORT=54322/);
  assert.match(runner, /Refusing a non-local Supabase API URL/);
  assert.match(runner, /m37-functional-tests\.mjs/);
  assert.match(runner, /m38-functional-tests\.mjs/);
  assert.match(workflow, /supabase stop --no-backup/);
});
