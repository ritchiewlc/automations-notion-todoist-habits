#!/usr/bin/env bash
# Sync SLACK_BOT_TOKEN → Cloudflare Worker habit-close-worker.
# Canon: Cursor Dashboard Secret (Cloud) or ~/.config/slack-bot/token (Mac).
# Never prints the secret.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_DIR="${HABIT_CLOSE_WORKER_DIR:-$ROOT/habit-close-worker}"
NAME="${WORKER_NAME:-habit-close-worker}"
FILE="${SLACK_BOT_TOKEN_FILE:-$HOME/.config/slack-bot/token}"

TOKEN="${SLACK_BOT_TOKEN:-}"
if [[ -z "$TOKEN" && -f "$FILE" ]]; then
  TOKEN="$(cat "$FILE")"
fi

if [[ -z "$TOKEN" ]]; then
  echo "missing SLACK_BOT_TOKEN env and $FILE" >&2
  echo "Add Cursor Dashboard Secret, or save local token, then re-run." >&2
  exit 1
fi

if [[ ! "$TOKEN" =~ ^xoxb- ]]; then
  echo "SLACK_BOT_TOKEN does not look like a bot token (expected xoxb-...)." >&2
  exit 1
fi

if [[ ! -d "$WORKER_DIR" ]]; then
  echo "missing worker dir: $WORKER_DIR" >&2
  exit 1
fi

cd "$WORKER_DIR"
# stdin only; never echo token
printf '%s' "$TOKEN" | npx -y wrangler@4 secret put SLACK_BOT_TOKEN --name "$NAME"

# Prove without exposing secret
slack_status="$(curl -sS "https://habit-close-worker.ritchiewlc.workers.dev/" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("slack"))')"
echo "CF Worker secret put OK. GET / slack=$slack_status (want: configured)"
if [[ "$slack_status" != "configured" ]]; then
  echo "FAIL: Worker still reports slack=$slack_status" >&2
  exit 1
fi
echo "Next (human, once): /invite the bot in #todoist-automation, then strip Notion Slack actions."
