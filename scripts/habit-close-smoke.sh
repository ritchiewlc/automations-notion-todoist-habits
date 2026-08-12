#!/usr/bin/env bash
# Smoke habit-close CF Worker against a live Todoist habit, then restore original due.
#
# HARD GATE (mechanical):
# 1. Never trust `td task update --json` (it WIPES due; proven 2026-08-11).
# 2. PASS only from a fresh `td task view` after reopen+restore.
# 3. EXIT trap always attempts undo if /close ran.
# 4. Slack face/icon proof must NOT use this script; use habit-slack-display-smoke.sh.
set -euo pipefail

HABIT="${1:-}"
if [[ -z "$HABIT" ]]; then
  echo "Usage: $0 <habit>   e.g. $0 workout" >&2
  exit 2
fi

BASE="${HABIT_CLOSE_BASE:-https://habit-close-worker.ritchiewlc.workers.dev}"
TASK_ID="$(python3 -c "
habits={
  'morning':'6Rv7q3HCJ3wGMfvF',
  'evening':'6Rv7qwcpV4CFWQ5F',
  'running':'69fRWfmQ4vXfPfCm',
  'workout':'6RvcVG6r8G3J9x8F',
  'clean-diet':'6X5MF4WvMv5Fjfrm',
  'basketball':'6RMX3jJvV9r8C3Hm',
  'yoga':'6RJ68vrrp7qQ3VGF',
  'cheat-meal':'6fXRqjC9vJM62Pvm',
  'haircut':'694w43cWcGJFWWjm',
}
print(habits.get('$HABIT',''))
")"
if [[ -z "$TASK_ID" ]]; then
  echo "unknown habit: $HABIT" >&2
  exit 2
fi

if ! command -v td >/dev/null 2>&1; then
  echo "td CLI required to capture/restore Todoist due" >&2
  exit 1
fi

BEFORE_FILE="$(mktemp)"
CLOSED=0

restore_todoist() {
  local due_string due_date restore
  due_string="$(python3 -c "import json;b=json.load(open('$BEFORE_FILE'));d=b.get('due') or {};print(d.get('string') or '')")"
  due_date="$(python3 -c "import json;b=json.load(open('$BEFORE_FILE'));d=b.get('due') or {};print((d.get('date') or '')[:10])")"
  if [[ -z "$due_string" || -z "$due_date" ]]; then
    echo "UNDO FAIL: missing captured due; cannot restore" >&2
    return 1
  fi
  restore="${due_string} starting ${due_date}"
  echo "POST /reopen/$HABIT (undo)"
  curl -sS -X POST "$BASE/reopen/$HABIT" | python3 -m json.tool || true
  # NEVER pass --json to td update: it wipes due.
  echo "restore due -> $restore"
  td task update "$TASK_ID" --due "$restore" >/dev/null
  python3 - "$TASK_ID" "$due_string" "$due_date" <<'PY'
import json, subprocess, sys
task_id, want_string, want_date = sys.argv[1], sys.argv[2], sys.argv[3]
raw = subprocess.check_output(["td", "task", "view", task_id, "--json", "--full"], text=True)
a = json.loads(raw)
due = a.get("due") or {}
got_date = (due.get("date") or "")[:10]
print(
    f"view checked={a.get('checked')!r} due_date={due.get('date')!r} "
    f"due_string={due.get('string')!r} recurring={due.get('isRecurring')!r}"
)
if a.get("checked") is not False:
    raise SystemExit(f"FAIL: checked must be False, got {a.get('checked')!r}")
if got_date != want_date:
    raise SystemExit(f"FAIL: due date want {want_date} got {due.get('date')!r}")
if due.get("string") != want_string:
    raise SystemExit(f"FAIL: due string want {want_string!r} got {due.get('string')!r}")
if due.get("isRecurring") is not True:
    raise SystemExit("FAIL: lost recurring flag")
print("RESTORE PASS")
PY
}

on_exit() {
  local ec=$?
  if [[ "$CLOSED" -eq 1 ]]; then
    echo "EXIT trap: ensuring Todoist undo (closed=$CLOSED ec=$ec)" >&2
    restore_todoist || echo "EXIT trap: restore failed; fix Todoist by hand NOW" >&2
  fi
  rm -f "$BEFORE_FILE"
  exit "$ec"
}
trap on_exit EXIT

td task view "$TASK_ID" --json --full >"$BEFORE_FILE"
python3 - "$BEFORE_FILE" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
due=b.get('due') or {}
print(f"before checked={b.get('checked')!r} due_date={due.get('date')!r} due_string={due.get('string')!r} recurring={due.get('isRecurring')!r}")
if b.get('checked') is not False:
  raise SystemExit('task already completed; refuse smoke (would lose original next due)')
if not due.get('string') or not due.get('date'):
  raise SystemExit('missing original due; refuse smoke')
if due.get('isRecurring') is not True:
  raise SystemExit('expected recurring habit; refuse smoke')
PY

echo "POST /close/$HABIT"
curl -sS -X POST "$BASE/close/$HABIT" | python3 -m json.tool
CLOSED=1

restore_todoist
CLOSED=0
