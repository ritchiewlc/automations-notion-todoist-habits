#!/usr/bin/env bash
# Prove habit Todoist tasks are open with due intact. Done gate after any habit-close cook.
# PASS only from `td task view`. Never mutate.
set -euo pipefail

python3 - "$@" <<'PY'
import json, subprocess, sys

HABITS = {
  "morning": "6Rv7q3HCJ3wGMfvF",
  "evening": "6Rv7qwcpV4CFWQ5F",
  "running": "69fRWfmQ4vXfPfCm",
  "workout": "6RvcVG6r8G3J9x8F",
  "clean-diet": "6X5MF4WvMv5Fjfrm",
  "basketball": "6RMX3jJvV9r8C3Hm",
  "yoga": "6RJ68vrrp7qQ3VGF",
  "cheat-meal": "6fXRqjC9vJM62Pvm",
  "haircut": "694w43cWcGJFWWjm",
}

names = sys.argv[1:] or list(HABITS)
fail = 0
for name in names:
  if name not in HABITS:
    print(f"FAIL unknown habit {name}")
    fail += 1
    continue
  tid = HABITS[name]
  raw = subprocess.check_output(["td", "task", "view", tid, "--json", "--full"], text=True)
  b = json.loads(raw)
  due = b.get("due") or {}
  checked = b.get("checked")
  ok = (
    checked is False
    and bool(due.get("date"))
    and bool(due.get("string"))
    and due.get("isRecurring") is True
  )
  status = "PASS" if ok else "FAIL"
  if not ok:
    fail += 1
  print(
    f"{status} {name} checked={checked!r} due={(due.get('date') or '')[:10]!r} "
    f"str={due.get('string')!r} recurring={due.get('isRecurring')!r}"
  )

if fail:
  print(f"AUDIT FAIL ({fail})")
  raise SystemExit(1)
print("AUDIT PASS")
PY
