#!/usr/bin/env bash
# Slack display-as-Notion proof (+ Open in Notion button). NEVER touches Todoist.
set -euo pipefail

TOKEN_FILE="${SLACK_BOT_TOKEN_FILE:-$HOME/.config/slack-bot/token}"
CHANNEL="${SLACK_HABIT_CHANNEL:-C0BH8VD2QU8}"
ICON="${SLACK_NOTION_ICON_URL:-https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png}"
NOTION_URL="${SLACK_NOTION_SMOKE_URL:-https://www.notion.so/346170bf84a1800fb3d8e9fe28f2037b}"
MENTION="${SLACK_HABIT_MENTION:-U01AQ1A9141}"

if [[ -n "${SLACK_BOT_TOKEN:-}" ]]; then
  TOKEN="$SLACK_BOT_TOKEN"
elif [[ -f "$TOKEN_FILE" ]]; then
  TOKEN="$(cat "$TOKEN_FILE")"
else
  echo "missing SLACK_BOT_TOKEN or $TOKEN_FILE" >&2
  exit 1
fi

TEXT="<@${MENTION}> habit Open in Notion smoke (no Todoist)"
BODY="$(python3 - <<PY
import json
print(json.dumps({
  "channel": "$CHANNEL",
  "text": """$TEXT""",
  "username": "Notion",
  "icon_url": "$ICON",
  "blocks": [
    {"type": "section", "text": {"type": "mrkdwn", "text": """$TEXT"""}},
    {"type": "actions", "elements": [{
      "type": "button",
      "text": {"type": "plain_text", "text": "Open in Notion"},
      "url": "$NOTION_URL",
      "action_id": "open_in_notion",
    }]},
  ],
}))
PY
)"

RESP="$(curl -sS -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "$BODY")"

python3 -c '
import json,sys
d=json.loads(sys.argv[1])
if not d.get("ok"):
  raise SystemExit("FAIL slack " + str(d.get("error")))
m=d.get("message") or {}
blocks=m.get("blocks") or []
has_btn=False
url=None
for b in blocks:
  for el in b.get("elements") or []:
    if el.get("type")=="button" and el.get("action_id")=="open_in_notion":
      has_btn=True
      url=el.get("url")
if not has_btn:
  raise SystemExit("FAIL missing Open in Notion button")
print("PASS username=%r button_url=%s ts=%s" % (m.get("username"), url, d.get("ts")))
' "$RESP"
unset TOKEN
