#!/usr/bin/env bash
# Applies every migration to a throwaway database, then runs the pgTAP tests.
set -euo pipefail

cd "$(dirname "$0")/../.."
DATABASE=bid_market_test
export PGHOST="${PGHOST:-localhost}" PGUSER="${PGUSER:-postgres}"

dropdb --if-exists "$DATABASE"
createdb "$DATABASE"
trap 'dropdb --if-exists "$DATABASE"' EXIT

run_psql() { psql -q -v ON_ERROR_STOP=1 -d "$DATABASE" "$@"; }

run_psql -c "create extension pgtap"
run_psql -f supabase/tests/support/supabase-stub.sql
for migration in supabase/migrations/*.sql; do run_psql -f "$migration"; done

status=0
for test_file in supabase/tests/*.test.sql; do
  output=$(run_psql -t -A -f "$test_file")
  echo "$output"
  if grep -qE '^(not ok|# Looks like)' <<<"$output"; then status=1; fi
done
exit "$status"
