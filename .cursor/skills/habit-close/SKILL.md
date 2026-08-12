---
name: habit-close
description: Notion habit logbooks → CF habit-close-worker → Todoist close + optional Slack as Notion. Use when testing habit-close, Todoist habit undo, workout Slack, or notion-todoist-habits smoke.
---

# habit-close

## SST

Local: `/Users/ritchiewlc/Repositories/wlc-automations/notion-todoist-habits`  
GitHub: `ritchiewlc/automations-notion-todoist-habits`  
Live: `https://habit-close-worker.ritchiewlc.workers.dev`

`personal/habit-close-worker/` is a mirror only. Open the SST above.

## HARD GATE (Todoist)

Root: soft gates failed repeatedly. `td task update --due … --json` **wipes due**. Done requires a fresh `td task view`, not Slack ok.

| Prove | Command | Touches Todoist? |
| --- | --- | --- |
| Worker health | `curl -sS https://habit-close-worker.ritchiewlc.workers.dev/` | No |
| Slack as Notion | `bash scripts/habit-slack-display-smoke.sh` | **No** |
| Close path | `bash scripts/habit-close-smoke.sh <habit>` | Yes, then undo+view |
| Done audit | `bash scripts/habit-todoist-audit.sh` | No (read only) |

Never ad-hoc `POST /close`. Never `td task update … --json`.

## Slack policy

- `morning` / `evening`: Todoist close only. Never Slack (`habit_no_slack`).
- Other habits: Slack as Notion when `SLACK_BOT_TOKEN` is set.

## Owner files

- Worker: `src/index.js` (this repo)
- Smoke/audit: `scripts/habit-*.sh`
- Rule: `.cursor/rules/habit-close-todoist-undo.mdc`
