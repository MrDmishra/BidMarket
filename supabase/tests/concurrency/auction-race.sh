#!/usr/bin/env bash
# Fires real parallel bids at a throwaway database. pgTAP runs in one session, so it cannot prove this.
set -euo pipefail

DATABASE=$1
HERE="$(dirname "$0")"
query() { psql -q -t -A -v ON_ERROR_STOP=1 -d "$DATABASE" -c "$1"; }
fail() { echo "not ok - $1"; exit 1; }

psql -q -v ON_ERROR_STOP=1 -d "$DATABASE" -f "$HERE/setup.sql" >/dev/null

bid() { # seller number, tender, price, key
  psql -q -t -A -d "$DATABASE" 2>&1 <<SQL
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000001$(printf %02d "$1")', true);
select set_config('request.jwt.claims', '{"aal":"aal1"}', true);
set local role authenticated;
select place_ra_bid('$2', $3, '$4');
commit;
SQL
}

# 1. Sixty parallel bids from ten sellers must form one strict descending chain.
RACE=d1000000-0000-0000-0000-000000000001
RESULTS=$(mktemp)
for round in $(seq 1 60); do
  bid $((round % 10 + 1)) "$RACE" $((90000 - RANDOM % 30000)) "race-$round" >>"$RESULTS" &
done
wait
UNEXPECTED=$(grep -c ERROR "$RESULTS" | tr -d ' ')
REFUSED=$(grep -c BID_TOO_HIGH "$RESULTS" | tr -d ' ')
[ "$UNEXPECTED" = "$REFUSED" ] || fail "the only refusals are bids above the limit"
[ "$(query "select count(*) from bids where tender_id = '$RACE'")" -ge 2 ] || fail "parallel bids were accepted"
[ "$(query "select bid_count::text from tenders where id = '$RACE'")" = "$(query "select count(*)::text from bids where tender_id = '$RACE'")" ] || fail "bid_count matches the bids stored"
[ "$(query "select seq::text from tenders where id = '$RACE'")" = "$(query "select count(*)::text from bids where tender_id = '$RACE'")" ] || fail "seq has no gaps"
[ "$(query "select l1_paise::text from tenders where id = '$RACE'")" = "$(query "select min(unit_paise)::text from bids where tender_id = '$RACE'")" ] || fail "L1 is the lowest accepted bid"
BROKEN=$(query "select count(*) from (select unit_paise, lag(unit_paise) over (order by placed_at) as previous from bids where tender_id = '$RACE') as chain where previous is not null and unit_paise > previous - ceil(previous * 50 / 10000.0)")
[ "$BROKEN" = "0" ] || fail "every accepted bid meets the decrement"
echo "ok - parallel bids form one strict chain ($(query "select count(*) from bids where tender_id = '$RACE'") accepted)"

# 2. The same key sent ten times at once must store one bid.
SAME=d1000000-0000-0000-0000-000000000002
for attempt in $(seq 1 10); do bid 1 "$SAME" 80000 same-key >/dev/null & done
wait
[ "$(query "select count(*) from bids where tender_id = '$SAME'")" = "1" ] || fail "a repeated key stores one bid"
echo "ok - repeated keys store one bid"

# 3. Bids sent across the deadline must never land after it.
LATE=d1000000-0000-0000-0000-000000000003
query "update tenders set snipe_extensions_used = 6, ra_ends_at = clock_timestamp() + interval '2 seconds', bid_ends_at = clock_timestamp() + interval '2 seconds' where id = '$LATE'" >/dev/null
: >"$RESULTS"
for round in $(seq 1 40); do
  ( sleep "$((round / 10)).$((round % 10))"; bid $((round % 10 + 1)) "$LATE" $((90000 - round * 500)) "late-$round" >>"$RESULTS" ) &
done
wait
LANDED_LATE=$(query "select count(*) from bids b join tenders t on t.id = b.tender_id where t.id = '$LATE' and b.placed_at >= t.ra_ends_at")
[ "$LANDED_LATE" = "0" ] || fail "no bid lands after the deadline"
grep -q AUCTION_CLOSED "$RESULTS" || fail "bids after the deadline were refused"
rm -f "$RESULTS"
echo "ok - no bid lands after the deadline"

# 4. A burst near the end extends at most six times.
SNIPE=d1000000-0000-0000-0000-000000000004
query "update tenders set ra_ends_at = clock_timestamp() + interval '1 minute', bid_ends_at = clock_timestamp() + interval '1 minute' where id = '$SNIPE'" >/dev/null
for round in $(seq 1 30); do bid $((round % 10 + 1)) "$SNIPE" $((90000 - RANDOM % 20000)) "snipe-$round" >/dev/null & done
wait
USED=$(query "select snipe_extensions_used from tenders where id = '$SNIPE'")
[ "$USED" -le 6 ] && [ "$USED" -ge 1 ] || fail "extensions stay within the limit"
EXPECTED=$(query "select abs(extract(epoch from (ra_ends_at - created_at)) - (60 + 300 * snipe_extensions_used)) < 60 from tenders where id = '$SNIPE'")
[ "$EXPECTED" = "t" ] || fail "each extension adds five minutes"
echo "ok - extensions stay within the limit ($USED used)"
